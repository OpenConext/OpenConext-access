# AGENTS.md — SURF Access (OpenConext-Access)

> AI rehydration document. Not for human onboarding. Optimized for density.

---

## 1. Project Overview

**SURF Access** is a federated identity & access management platform for Dutch education/research. It connects institutions (IdPs) to application providers (SPs) via SURFconext, managing service registrations, authorization policies, and user access.

### Business Domain

| Concept | Meaning |
|---------|---------|
| **Organization** | An institution (university, research org) that owns applications and has members |
| **Application** | A service registration (SAML SP or OIDC RP) owned by an organization |
| **Connection** | A specific protocol endpoint (SAML/OIDC) within an application, synced to Manage |
| **Manage** | SURFconext's external metadata registry — the source of truth for IdP/SP entities |
| **Policy** | Authorization rule (regular = attribute-based allow/deny, step-up = LoA enforcement) |
| **Invitation** | Email-based invite to join an organization with a role (ADMIN/MEMBER/GUEST) |
| **Institution Admin** | User whose IdP entitlement grants admin rights over their institution's org |

### Main User Flows

1. **User logs in** → OIDC via SURFconext → auto-provisioned in DB → org membership resolved
2. **Org admin manages applications** → creates Application → adds Connections (OIDC/SAML) → synced to Manage
3. **IdP admin manages access** → views connected SPs → configures authorization policies → connect/disconnect SPs
4. **Super admin** → approves new organizations → imports entities from Manage → system-wide management
5. **User accepts invitation** → hash-based link → joins org with intended authority

---

## 2. Architecture

### Backend (Spring Boot)

**Spring Boot 3.5.13, Java 21, Maven multi-module**

#### Package Map (`server/src/main/java/access/`)

| Package | Responsibility |
|---------|---------------|
| `api/` | REST controllers (18), `UserAccessRights` interface, `S3Storage`, `FullSearchQueryParser` |
| `config/` | `Config` (app config POJO), `FeatureName` enum, `Feature` record |
| `exception/` | `NotFoundException` (404), `InvalidInputException` (400), `DuplicateJoinRequestException` (409), `UserRestrictionException` (403), `NotAllowedException` (409) |
| `lifecycle/` | `UserLifeCycleController` — external deprovision API (Basic Auth) |
| `mail/` | Email service using Mustache templates (`templates/` dir) |
| `manage/` | `Manage` interface + `RemoteManage`/`LocalManage` impls; policy/provider DTOs (`PolicyDefinition`, `LoA`, `CidrNotation`, `IPInfo`, `PolicyAttribute`, `ChangeRequest`, `Contact`, `MetaData`) |
| `manipulation/` | `SpelAttributeManipulationService` — SpEL-based attribute manipulation |
| `model/` | 8 JPA entities + enums + DTOs (see Section 3) |
| `repository/` | 8 Spring Data JPA repositories |
| `security/` | `SecurityConfig`, `CustomOidcUserService`, `UserHandlerMethodArgumentResolver`, `AuthorizationRequestCustomizer`, `SuperAdmin`, `InstitutionAdmin`, `LocalDevelopmentAuthenticationFilter` |
| `service/` | Business services |

#### Key Frameworks

| Lib | Purpose |
|-----|---------|
| Spring Data JPA + Hibernate | ORM, `@EntityGraph` for eager loading |
| Flyway 11.20.3 | DB migrations (`db/mysql/migration/V1_0` through `V15_0`) |
| MariaDB 10.11 | Primary database (via `mariadb-java-client` 3.5.8) |
| Spring Session JDBC | Server-side sessions |
| Spring Security OAuth2 Client + Resource Server | OIDC login + Bearer token introspection |
| OpenSAML 4.3.2 | SAML metadata parsing |
| AWS SDK S3 2.42.30 | Logo image storage (MinIO locally) |
| Hypersistence Utils | `@Type(JsonType.class)` for JSON columns |
| Mustache 0.9.14 | Email templates |
| SpringDoc OpenAPI 2.8.16 | Swagger UI (enabled in `local` profile) |

#### Patterns

- **Layered**: Controller → Service → Repository. No hexagonal/ports-adapters.
- **Programmatic authorization**: `UserAccessRights` default interface methods, NOT `@PreAuthorize`. All controllers implement this interface.
- **Manage abstraction**: `Manage` interface with `RemoteManage` (HTTP to SURFconext) and `LocalManage` (static JSON files) implementations. Single `manage.url`; no TEST/PROD split.
- **Auto-provisioning**: Users and org memberships created on first login via `UserController.me()`.
- **JSON columns**: `Application.metaData` and `Connection.metaData` stored as `jsonb` via Hypersistence `JsonType`.
- **`@JsonProperty(WRITE_ONLY)`** on all `@ManyToOne` fields; custom `@JsonProperty(READ_ONLY)` getters return flat maps to prevent cyclic serialization.

#### Security Model

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | OAuth2/OIDC via `oidcng` provider (SURFconext). `CustomOidcUserService` enriches claims. |
| **User resolution** | `UserHandlerMethodArgumentResolver` extracts `User` from security context for every controller method. |
| **Authorization hierarchy** | `superUser` > `institutionAdmin` > `ADMIN` > `MEMBER` > `GUEST` (via `Authority` enum with `rights` int) |
| **Impersonation** | `X-IMPERSONATE-ID` header; super users only |
| **External API** | HTTP Basic Auth for lifecycle deprovision + Prometheus (`@Order(2)` filter chain, stateless) |
| **Dev mode** | `LocalDevelopmentAuthenticationFilter` injects fake OAuth2 token (profile=dev) |
| **Super admins** | Configured in `super-admin.users` (list of `sub` values) |

### Frontend (React)

**React 19, Vite 8, ESM**

#### State Management

Single **Zustand** store (`stores/AppStore.js`):

| Field | Type | Set By |
|-------|------|--------|
| `user` | `Object` | `App.jsx` on login (`/api/v1/users/me`) |
| `config` | `Object` | `App.jsx` on init (`/api/v1/users/config`) — includes `acrValues`, `features`, `stats` |
| `allowedAttributes` | `Array` | `App.jsx` on init (`/api/v1/manage/allowed-attributes`) |
| `currentOrganization` | `{name}` | Org switcher in header |
| `csrfToken` | `String` | `App.jsx` on init (`/api/v1/csrf`) |
| `flash` | `{msg, className, type}` | `setFlash()` action, auto-hides after 6.5s |
| `impersonator` | `User\|null` | `startImpersonation()`/`stopImpersonation()` |
| `arp`, `privacy` | Manage metadata | `App.jsx` on init |
| `breadcrumbPaths`, `activeMenuItem`, `menuItems` | Navigation state | Various pages |

#### Routing (`App.jsx`)

Two route trees based on `isAuthenticated`:
- **Authenticated**: `/home` (UserHome), `/organization/:id/:tab?`, `/application/:id`, `/connection/:appId/:tab?/:connId?`, `/policies/:page?/:policyId?`, `/system/:tab?`, `/profile`, `/invitation/:orgId/:appId?`, `/accept`, `/idp/:orgId`, `/catalogue`, `/accessible-apps`, etc.
- **Unauthenticated**: `/home` (Home), `/institutions`, `/applications`, `/connect`, `/login-info`, `/application-detail/:type/:id`

#### Component Architecture

- **Pages** (`pages/`): Route-level components (30+). Fetch data in `useEffect`, manage local state.
- **Sub-views**: `policies/`, `organization/`, `connection/`, `application/` — domain-specific sub-components.
- **Shared components** (`components/`): `Entities` (generic table), `SelectField` (wraps react-select), `ConfirmationDialog`, `InputField`, `SwitchField`, `Tabs`/`Tab`, `BreadCrumb`, `Flash`, `AuthorizedHeader`, `SharedMenu`, `UserFeedbackWidget`, etc.
- **SCSS co-located**: Every component has a `.scss` sibling. No CSS modules. Global vars in `styles/vars.scss`.
- **SDS**: `@surfnet/sds` provides base UI components (Modal, Checkbox, Button, Chip, Tooltip, icons). External — cannot modify internals. SDS Checkbox must NOT be wrapped in `<label>` (causes double-toggle).

### Integration

#### API Structure

All REST, no GraphQL. Central fetch layer in `api/index.js` with `validFetch()` wrapper. Every request includes:
- `Accept-Language` header (i18n)
- `X-CSRF-TOKEN` header
- `X-IMPERSONATE-ID` header (when impersonating)

Vite dev proxy: `/api/v1` and `/config` → `http://localhost:8886`

#### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/users/config` | Public. Returns `Config` object (features, acrValues, stats, etc.) |
| `GET /api/v1/users/me` | Returns authenticated user with org memberships, auto-provisions |
| `GET /api/v1/csrf` | Returns CSRF token |
| `GET /api/v1/organizations/applications/{id}` | Org detail with apps and connections |
| `POST/PUT /api/v1/connections` | Create/update connection (synced to Manage) |
| `GET /api/v1/manage/policies?entityId=&organizationId=` | Fetch policies for SP from Manage |
| `POST/PUT/DELETE /api/v1/manage/policies` | CRUD policies in Manage |
| `GET /api/v1/manage/allowed-service-providers/{orgId}` | SPs accessible to org's IdP |
| `GET /api/v1/manage/allowed-attributes` | Attribute names for policy rules |
| `GET /api/v1/public/service-providers` | Public SP listing (filtered by visibility) |
| `POST /api/v1/feedback` | Submit user feedback with screenshot |
| `DELETE /api/external/v1/deprovision/{userId}` | External lifecycle deprovision (Basic Auth) |

#### External Systems

| System | Integration | Config |
|--------|------------|--------|
| **SURFconext OIDC** | OAuth2 login provider | `spring.security.oauth2.client` → `connect.test2.surfconext.nl` |
| **Manage** | REST API for IdP/SP metadata, policies, change requests | `manage.url` → `manage.test2.surfconext.nl` |
| **Invite (SRAM)** | REST API for role-based access | `invite.*` → `invite.test2.surfconext.nl` |
| **JIRA** | Ticket creation for org approvals, connection requests | `jira.*` (disabled by default) |
| **S3/MinIO** | Logo image storage | `s3storage.*` → `localhost:9000` |
| **SMTP** | Invitation/notification emails (Mustache templates) | `spring.mail.*` → `localhost:1025` (Mailpit) |
| **Statistics** | Login stats API | `statistics.*` → `localhost:8081` |

---

## 3. Key Data Models

### Entity Relationship Diagram

```
User 1──* OrganizationMembership *──1 Organization
                │                          │
                1                          1
                *                          *
         ApplicationMembership *──1 Application
                                       │
                                       1
                                       *
                                   Connection

User 1──* JoinRequest *──1 Organization
Organization 1──* Invitation *──1 User (invitee)
                      *──* Application (join table: invitations_applications)
```

### Core Entities

#### `User` (table: `users`)
- `id` (Long PK), `sub` (OIDC subject), `email`, `name`, `givenName`, `familyName`
- `eduPersonPrincipalName`, `schacHomeOrganization`, `subjectId`, `eduId`, `uid`
- `superUser` (boolean), `institutionAdmin` (boolean), `organizationGUID`
- `authenticatingAuthority`, `createdAt`, `lastActivity`
- **Relationships**: `organizationMemberships` (OneToMany EAGER), `joinRequests` (OneToMany EAGER)
- **Transient**: `institution` (Institution POJO), `identityProvider` (Map), `changeRequests`, `loaLevel`, `externalUser`

#### `Organization` (table: `organizations`)
- `id`, `name`, `schacHomeOrganization`, `manageIdentifier`, `manageVersion`, `ticketKey`
- `status` (enum: `PENDING_APPROVAL`, `APPROVED`, `DISAPPROVED`), `createdAt`
- **Formula fields**: `memberCount`, `applicationCount`
- **Relationships**: `applications`, `organizationMemberships`, `joinRequests`, `invitations` (all OneToMany LAZY)
- **Transient**: `metaData` (Map), `changeRequests`

#### `Application` (table: `applications`)
- `id`, `name`, `logoUrl`, `metaData` (JSON column), `createdAt`, `createdBy`
- `status` (enum: `OPEN`, `COMPLETE`), `target` (`SURF`, `SRAM`), `type` (`APP`, `CONTENT`)
- `signedContract` (boolean)
- **Relationships**: `organization` (ManyToOne), `connections` (OneToMany), `applicationMemberships` (OneToMany), `owner` (ManyToOne User)

#### `Connection` (table: `connections`)
- `id`, `name`, `metaData` (JSON column), `manageIdentifier`, `manageVersion`, `manageEid`
- `protocol` (enum: `saml20_sp`, `oidc10_rp`), `state` (`testaccepted`, `prodaccepted`), `status` (enum: `OPEN`, `IN_PROGRESS`, `COMPLETE`, `PENDING_PROD`, `PROD_READY`), `secretSet`
- `createdAt`, `updatedAt` (`@PreUpdate` auto-set)
- **Relationship**: `application` (ManyToOne)
- **Transient**: `changeRequests`
- **`state` vs `status`**: these are two different fields. `state` is the Manage environment signal — `testaccepted` (default) or `prodaccepted`. `status` is the internal workflow state. Do not confuse them. `changeRequestRequired()` = `state.equals(State.prodaccepted)`.
- **Note**: `environment` field was removed — `state` is the sole source of truth for TEST/PROD. No DB migration was needed.

#### `OrganizationMembership` (table: `organization_memberships`)
- `id`, `authority` (enum: `ADMIN`=2, `MEMBER`=1, `GUEST`=0), `createdAt`
- **Relationships**: `user` (ManyToOne), `organization` (ManyToOne), `applicationMemberships` (OneToMany)

#### `ApplicationMembership` (table: `application_memberships`)
- `id`, `authority`, `createdAt`
- **Relationships**: `application` (ManyToOne), `organizationMembership` (ManyToOne)

#### `Invitation` (table: `invitations`)
- `id`, `email`, `hash`, `message`, `language` (en/nl), `intendedAuthority`
- `status` (`OPEN`, `ACCEPTED`, `EXPIRED`), `createdAt`, `expiryDate` (30d default), `acceptedAt`
- **Relationships**: `organization` (ManyToOne), `invitee` (ManyToOne User), `applications` (ManyToMany via join table)

#### `JoinRequest` (table: `join_requests`)
- `id`, `language`, `message`, `createdAt`
- **Relationships**: `user` (ManyToOne EAGER), `organization` (ManyToOne EAGER)

### Manage DTOs (not persisted — sent to/from Manage API)

#### `PolicyDefinition`
- `name`, `description`, `entityid`, `type` ("reg" or "step"), `active`, `denyRule`
- `allAttributesMustMatch`, `serviceProvidersNegated`
- `attributes` (List\<PolicyAttribute\>): `{name, value, negated}`
- `loas` (List\<LoA\>): for step-up policies
- `serviceProviderIds`, `identityProviderIds` (List\<PolicyProvider\>)
- `denyAdvice`, `denyAdviceNl`

#### `LoA`
- `level` (URI string, e.g. `http://test2.surfconext.nl/assurance/loa2`)
- `allAttributesMustMatch`, `negateCidrNotation`
- `attributes` (List\<PolicyAttribute\>), `cidrNotations` (List\<CidrNotation\>)

#### `CidrNotation`
- `ipAddress`, `prefix` (int), `ipInfo` (IPInfo — computed on construction)

#### `IPInfo`
- `networkAddress`, `broadcastAddress`, `capacity` (double), `ipv4` (boolean), `prefix`

### Key Enums

| Enum | Values |
|------|--------|
| `Authority` | `ADMIN(2)`, `MEMBER(1)`, `GUEST(0)` — has `isAllowed(Authority)` |
| `OrganizationStatus` | `PENDING_APPROVAL`, `APPROVED`, `DISAPPROVED` |
| `ApplicationStatus` | `OPEN`, `COMPLETE` |
| `ConnectionStatus` | `OPEN`, `IN_PROGRESS`, `COMPLETE`, `PENDING_PROD`, `PROD_READY` |
| `EntityType` | `saml20_sp`, `oidc10_rp`, `saml20_idp`, `policy` |
| `FeatureName` | `idp`, `invite`, `sram`, `mfa` |

---

## 4. Important Code Paths

### User Login & Auto-Provisioning Flow

1. Browser → `/api/v1/users/login` → Spring redirects to OIDC authorization endpoint
2. SURFconext authenticates → callback to `/login/oauth2/code/oidcng`
3. `CustomOidcUserService.loadUser()` → looks up user by `sub` → checks institution admin entitlement → if institution admin with `organizationGUID`, calls `manage.identityProvidersByInstitutionalGUID()` and stores `Institution` in OIDC claims → updates/creates user in DB
4. `UserHandlerMethodArgumentResolver` resolves `User` for subsequent requests
5. Client calls `GET /api/v1/users/me` → `UserController.me()`:
   - Calls `manage.identityProviderByEntityID(authenticatingAuthority)` to get the IdP map
   - Derives `manageIdentifier` (`_id`) from the IdP map
   - If user has no membership matching that `manageIdentifier`: looks up org by `manageIdentifier`
     - **Found**: joins existing org
     - **Not found**: creates new org named `"<idp name:en> (<idp OrganizationName:en>)"`, status `APPROVED`
   - Sets transient fields: `identityProvider`, `institution` (from OIDC claims), `changeRequests`, `loaLevel`
6. Client stores user in Zustand, computes menu items based on roles

**Key implication**: `UserController.me()` always calls `manage.identityProviderByEntityID` for non-external users. In tests, this requires a WireMock stub for `POST /manage/api/internal/search/saml20_idp` to be registered and available at the time of the `/me` call.

### Policy Evaluation (client-side flow)

1. `Policies.jsx` mounts → calls `getPolicyByServiceProviderEntityId()` or `getPolicyByIdentityProvider()` → Manage API
2. Policies displayed in `PolicyOverview.jsx` via `policyBreakDowwn()` for human-readable descriptions
3. User clicks edit → `PolicyForm.jsx` renders with policy data
4. For **regular** policies: top-level `attributes[]`, `allAttributesMustMatch`, `denyRule`, `denyAdvice`
5. For **step-up** policies: `loas[0]` with `level`, `attributes[]` (with `negated`), `cidrNotations[]`, `allAttributesMustMatch`, `negateCidrNotation`
6. On save → `flatMapByValues()` converts grouped attributes back to flat → `newPolicy()`/`updatePolicy()` → `ManageController` → `Manage.createPolicy()`/`Manage.updatePolicy()`

### Connection Lifecycle

1. Org admin creates Application → `ApplicationController.create()` → saves to DB
2. Admin adds Connection → `ConnectionController.create()` → generates OIDC client ID/secret if needed → `Manage.saveProvider()` syncs to Manage
3. Connection metadata updates → change requests created in Manage → visible in Connection detail tabs
4. Production status request → `ConnectionController.requestProductionStatus()` → creates JIRA ticket + Manage change request
5. IdP admin can connect/disconnect SPs → `IdentityProviderController.connect()`/`disconnect()` → Manage link/unlink requests

### Policy Data Transform (client)

- **Server → Client** (`Policies.jsx:toPolicyDetail`): For step policies, `loas[0].attributes` is run through `groupByValues()` to merge same-name attributes into `{name, value: [...], negated}` objects
- **Client → Server** (`PolicyForm.jsx:submit`): `flatMapByValues()` expands back to per-value `{name, value, negated}` entries

---

## 5. Architecture Decisions (permanent, not in-flight)

These are baked into the codebase. Do not revisit without good reason.

| Decision | Detail |
|----------|--------|
| **Single Manage URL** | `manage.url` only. No TEST/PROD split. `Connection.state` (`testaccepted`/`prodaccepted`) is the sole environment signal. |
| **`Connection.state` default** | `testaccepted`. `changeRequestRequired()` = `state.equals(State.prodaccepted)`. |
| **`mergeAllowedEntities` always runs** | Previously skipped for non-TEST connections; now unconditional. |
| **`ConnectionProviderConverter` state priority** | `connection.getState()` if non-null, else `defaultState`. |
| **Step-up policies always use `loas[0]`** | Single LoA entry per policy. |
| **No deny advice fields for step-up** | Step-up policies do not use `denyAdvice`/`denyAdviceNl`. |
| **LoA defaults to first `acrValues` entry** | loa1.5 for new step-up policies. |
| **Per-attribute negation** | "is any of"/"is none of" dropdown toggles `attribute.negated`. |
| **CIDR negation** | Single dropdown controls `loa.negateCidrNotation` for all CIDR entries. |
| **CIDR validation** | IPv4 prefix 8–32, IPv6 prefix 32–128, auto-correct on blur. |
| **Screenshot capture** | Runs in background via `html2canvas`, does not block modal open. |
| **Manage API contract fixed** | Policy structure must match Manage's expected format exactly. |
| **`Config.java` copy constructor** | Must include any new config fields added. |

---

## 6. Codebase State

**As of the last session: all work is complete, no in-flight changes, full test suite green.**

- Backend: **262 tests, 0 failures, 2 skipped**
- Frontend: **7 tests, all pass** (`yarn test`)
- `mvn` binary is at `/usr/local/bin/mvn` (not always in `PATH` — use the full path or add it)

### What Has Been Built

| Feature | Where |
|---------|-------|
| Step-up policy editing (LoA, per-attribute negation, CIDR) | `PolicyForm.jsx`, `Policy.js`, `Policies.jsx` |
| Mac Mail-style feedback widget with screenshot | `UserFeedbackWidget.jsx` |
| Locale sync script + key parity test | `sync-locales.js`, `en.test.js` |
| Single-Manage-URL refactor (`Environment` enum removed) | `RemoteManage`, `LocalManage`, `ManageConf`, `Connection`, `ConnectionProviderConverter`, `application.yml`, `Testing.jsx`, `Manage.js` |
| Flaky test fix (`createOrganizationForInstitutionAdmin`) | `UserControllerTest.java` |

---

## 7. Known Issues / Tech Debt

### Typos in Production Code
- `policyDesscription` (double 's') — `Policy.js:135`, imported in `PolicyForm.jsx`
- `policyBreakDowwn` (double 'w') — `Policy.js:85`, imported in `PolicyOverview.jsx`
- These are exported function names — renaming requires updating all import sites.

### Formatting
- `sync-locales.js` normalizes file formatting when rewriting (strips comments, joins multi-line string concatenation, normalizes trailing commas). The comment `//Leave empty for no tips` in locale files will be lost on sync-rewrite.

### Pre-existing Java LSP Errors
- Multiple LSP errors in server files (`UserAccessRights.java`, `UserController.java`, `ApplicationController.java`, `ApplicationControllerTest.java`, etc.) — these are Lombok-generated method references that the LSP doesn't resolve. Not actual compilation errors.

### Test Coverage
- Only 5 test files / 7 tests on frontend (locale sync, utils, store). No component/integration tests.

### Database
- Flyway migration `V2` is missing (skipped from V1 to V3). Intentional or historical accident — do not fill in.

### Open Questions
- Whether to rename the typo'd functions (`policyDesscription`, `policyBreakDowwn`)
- Whether `sync-locales.js` should be integrated into CI (fail build if locales are out of sync)
- Frontend test coverage is minimal — no component or integration tests exist

---

## 8. Setup & Run

### Prerequisites
- Java 21, Maven >= 3.9 (binary at `/usr/local/bin/mvn`), Node 24.12 (`.nvmrc`), Yarn, Docker

### Start

```bash
# 1. Infrastructure (MariaDB + Mailpit)
docker compose up -d

# 2. Create database (first time)
mysql -uroot -h127.0.0.1 -psecret -e \
  "CREATE DATABASE access CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;"
mysql -uroot -h127.0.0.1 -psecret -e \
  "CREATE USER 'access'@'%' IDENTIFIED BY 'secret'; GRANT ALL ON access.* TO 'access'@'%';"

# 3. Server (port 8886)
cd server && /usr/local/bin/mvn spring-boot:run

# 4. Client (port 3002, proxies API to 8886)
cd client && nvm use && yarn install && yarn dev

# Run backend tests
cd server && /usr/local/bin/mvn test

# Run frontend tests
cd client && yarn test
```

### Profiles

| Profile | DB | Notes |
|---------|-----|-------|
| (default) | `access` / `access:secret` | Manage enabled against `test2.surfconext.nl` |
| `local` | `access_local` / `root:` | JIRA staging enabled, Swagger UI enabled |
| `devconf` | `invite` / `inviterw:secret` | Port 8080, containerized MariaDB, Manage disabled (static JSON) |

### Config Highlights

- `application.yml`: `config.acrValues` (3 LoA URIs), `config.features` (idp, invite, sram, mfa), `config.clientUrl`, `config.feedbackWidgetEnabled`
- `manage.url` is a single URL — no `manage.test.url` or `manage.prod.url`
- No `.env` files — all config via Spring YAML profiles
- Docker images: `ghcr.io/openconext/openconext-access/{accessclient,accessserver}` (multi-arch)

---

## 9. Conventions

### Naming
- **Backend**: Standard Java/Spring naming. Entities in `model/`, DTOs in `manage/`. Enums are top-level in `model/`.
- **Frontend**: PascalCase for components/pages, camelCase for utils/hooks. SCSS files co-located with components.
- **i18n keys**: Dot-separated hierarchy matching component structure (`policies.form.allow`, `appAccess.regularPolicies`).
- **API paths**: `/api/v1/{resource}` (RESTful). External: `/api/external/v1/`.

### Code Style
- Frontend: ESM (`"type": "module"`), no TypeScript, functional components only, hooks for state
- Backend: Lombok (`@Data`, `@NoArgsConstructor`, etc.), `@JsonProperty(WRITE_ONLY/READ_ONLY)` pattern for entity serialization
- SCSS: Plain class names (not CSS modules), shared vars in `styles/vars.scss`
- Trailing commas in JS objects (project convention)

### Testing
- **Frontend**: Vitest 4.1.3. Tests in `__tests__/` subdirs. Run: `yarn test`
- **Backend**: JUnit 5 + Spring Boot Test + WireMock + real MariaDB (Testcontainers config in `testcontainers.properties`). JaCoCo for coverage. Run: `/usr/local/bin/mvn test`
- **Locale test**: Verifies en/nl have identical keys in identical order. `sync-locales.js` for automated sync.
- **CI**: GitHub Actions on push/PR to `main` — builds both server and client, runs tests.

---

## 10. WireMock Stub Patterns (critical for test correctness)

### `openIDConnectFlow` consumes stubs

`openIDConnectFlow(path, sub, userInfoEnhancer)` drives the full Spring Security OIDC handshake. When the user has institution admin entitlements (`institutionalAdminEntitlementOperator`), Spring calls `CustomOidcUserService.loadUser()` which calls `manage.identityProvidersByInstitutionalGUID(organizationGuid)` — this hits `POST /manage/api/internal/search/saml20_idp` and **consumes** any WireMock stub registered for that URL.

After `openIDConnectFlow` returns, any explicit call to `GET /api/v1/users/me` will trigger `UserController.me()` which calls `manage.identityProviderByEntityID(authenticatingAuthority)` — also `POST /manage/api/internal/search/saml20_idp`. If no stub remains, WireMock returns 404 and the chain fails (or silently creates a wrong org in the DB).

### Required stub pattern for institution admin tests

```java
// Before openIDConnectFlow: stub for CustomOidcUserService (consumed during OIDC auth)
super.stubForIdentityProviderByInstitutionalGUID(ORGANISATION_GUID);
super.stubForGetChangeRequests(getChangeRequests());

AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
        institutionalAdminEntitlementOperator(ORGANISATION_GUID));

// After openIDConnectFlow: re-register stubs consumed during OIDC auth
super.stubForIdentityProviderByEntityId("http://mock-idp");
super.stubForGetChangeRequests(getChangeRequests());

// Now safe to call /me explicitly
Map<String, Object> res = given()...get("/api/v1/users/me")...;
```

### Stub URL note

Both `stubForIdentityProviderByInstitutionalGUID` and `stubForIdentityProviderByEntityId` stub `POST /manage/api/internal/search/saml20_idp`. They are **not** differentiated by body matching — last registered wins. This is intentional: the `identityProvidersByInstitutionalGUID` stub serves the OIDC phase; the `identityProviderByEntityId` stub serves the explicit `/me` phase.

### WireMock reset

`CustomWireMockExtension.afterEach` calls `this.resetAll()` — all stubs are wiped between tests. Any state leak is due to missing stub registrations, not missing resets.

### Test seed data (`doSeed()`) — delete ordering

`AbstractTest.doSeed()` deletes in this order: `users` → `applications` → `organizations` → `joinRequests`. All FK constraints in the schema use `ON DELETE CASCADE`, so deletion of parent rows cascades to child rows. `invitationRepository` is NOT explicitly deleted — it relies on cascade from `users` and `organizations`. This is intentional.

---

## 11. Test Fixture Quick Reference

### Seeded Users (`AbstractTest`)

| Constant | `sub` | Role | Notes |
|----------|-------|------|-------|
| `SUPER_SUB` | `urn:collab:person:example.com:super` | superUser | |
| `ADMIN_SUB` / `MANAGE_SUB` | `urn:collab:person:example.com:admin` | ADMIN of ShareLogics | |
| `GUEST_SUB` | `urn:collab:person:example.com:guest` | MEMBER of FarWind | `schacHomeOrganization=eduid.nl` |
| `EXTERNAL_USER_SUB` | `urn:collab:person:example.com:external` | GUEST of ShareLogics | `schacHomeOrganization=eduid.nl` |
| `MULTIPLE_ORG_SUB` | `urn:collab:person:example.com:multiple` | MEMBER of ShareLogics + Logistics | superUser=true |
| `INSTITUTION_ADMIN` | `urn:collab:person:example.com:institution_admin` | institutionAdmin | `organizationGUID=ORGANISATION_GUID` |

### Seeded Organizations

| Name | `manageIdentifier` | `schacHomeOrganization` |
|------|--------------------|------------------------|
| `ShareLogics` | `7` | `sharelogics.org` |
| `Logistics` | `8` | `logistics.org` |
| `FarWind` | (none) | `farwind.org` |

### Key Mock IdP/SP Fixtures (`server/src/main/resources/manage/`)

| File `_id` | `entityid` | `name:en` | `OrganizationName:en` | `coin:institution_guid` |
|-----------|-----------|----------|----------------------|------------------------|
| `saml20_idp.json` id=`7` | `http://mock-idp` | `Mock IdP EN` | `SURF bv` | `ad93daef-0911-e511-80d0-005056956c1a` (`ORGANISATION_GUID`) |
| `saml20_idp.json` id=`8` | `http://eduid-idp` | `eduID IdP EN` | `SURF bv` | (none) |
| `saml20_idp.json` id=`9` | `http://uu-idp` | `Idp UU EN` | `SURF bv` | `test_institution_guid` |

`ORGANISATION_GUID` = `ad93daef-0911-e511-80d0-005056956c1a`

---

## 12. Useful File Map

### Backend

| File | Description |
|------|-------------|
| `server/pom.xml` | Maven config, all dependencies with versions |
| `server/src/main/resources/application.yml` | Main config (DB, OIDC, Manage, features, acrValues) |
| `server/src/main/resources/application-local.yml` | Local dev overrides |
| `server/src/main/resources/db/mysql/migration/` | Flyway migrations V1–V15 |
| `server/src/main/resources/manage/` | Static JSON fixtures used by `LocalManage` (saml20_idp, saml20_sp, policies, etc.) |
| `server/src/main/java/access/security/SecurityConfig.java` | Two filter chains, CSRF config, public endpoints |
| `server/src/main/java/access/security/CustomOidcUserService.java` | OIDC user enrichment + DB sync; calls `identityProvidersByInstitutionalGUID` for institution admins |
| `server/src/main/java/access/security/UserHandlerMethodArgumentResolver.java` | Resolves `User` from security context, handles impersonation |
| `server/src/main/java/access/api/UserAccessRights.java` | Programmatic authorization methods (default interface) |
| `server/src/main/java/access/api/UserController.java` | `/users/config`, `/users/me`, `/users/login`, user CRUD; auto-provisions org on `/me` |
| `server/src/main/java/access/api/ManageController.java` | Policy CRUD, SP/IdP lookups, ARP/attributes |
| `server/src/main/java/access/api/ApplicationController.java` | Application CRUD, import, migrate |
| `server/src/main/java/access/api/ConnectionController.java` | Connection CRUD, secret reset, production status |
| `server/src/main/java/access/api/OrganizationController.java` | Organization CRUD, approval, search |
| `server/src/main/java/access/api/IdentityProviderController.java` | IdP connect/disconnect SPs |
| `server/src/main/java/access/api/InvitationController.java` | Invitation CRUD, accept, resend |
| `server/src/main/java/access/api/FeedbackController.java` | Feedback with screenshot submission |
| `server/src/main/java/access/manage/Manage.java` | Interface for Manage metadata registry |
| `server/src/main/java/access/manage/RemoteManage.java` | HTTP implementation of Manage (single URL, single RestTemplate) |
| `server/src/main/java/access/manage/LocalManage.java` | Static-JSON implementation used in tests and `devconf` profile |
| `server/src/main/java/access/manage/ConnectionProviderConverter.java` | Converts Connection entities to/from Manage provider format |
| `server/src/main/java/access/manage/PolicyDefinition.java` | Policy DTO (reg + step-up) |
| `server/src/main/java/access/manage/LoA.java` | LoA model (level, attributes, cidrNotations) |
| `server/src/main/java/access/model/User.java` | User entity |
| `server/src/main/java/access/model/Organization.java` | Organization entity |
| `server/src/main/java/access/model/Application.java` | Application entity (has JSON metaData column) |
| `server/src/main/java/access/model/Connection.java` | Connection entity; `state` default=`testaccepted`; `environment` field removed |
| `server/src/main/java/access/model/Authority.java` | ADMIN/MEMBER/GUEST enum with rights hierarchy |
| `server/src/main/java/access/config/Config.java` | `@ConfigurationProperties` — acrValues, features, clientUrl, etc. |
| `server/src/test/java/access/AbstractTest.java` | Base test class: WireMock wiring, seed data, `openIDConnectFlow`, stub helpers |
| `server/src/test/java/access/AbstractMailTest.java` | Extends AbstractTest; adds Mailpit/SMTP support |

### Frontend

| File | Description |
|------|-------------|
| `client/package.json` | Dependencies, scripts, ESM config |
| `client/vite.config.js` | Dev server (port 3002), API proxy to 8886, SVGR plugin |
| `client/src/main.jsx` | Entry point, BrowserRouter |
| `client/src/App.jsx` | Route definitions, initial data fetching, auth state |
| `client/src/api/index.js` | All API functions, `validFetch` wrapper with CSRF/impersonation headers |
| `client/src/stores/AppStore.js` | Zustand store (user, config, flash, impersonation, etc.) |
| `client/src/pages/Policies.jsx` | Policy management page, fetches/transforms policy data |
| `client/src/policies/PolicyForm.jsx` | Policy editor (reg + step-up), ~635 lines |
| `client/src/policies/PolicyOverview.jsx` | Policy list with actions |
| `client/src/policies/PolicyChoiceDialog.jsx` | Dialog to choose policy type (reg vs step-up) |
| `client/src/utils/Policy.js` | Policy templates, `groupByValues`, `flatMapByValues`, `policyBreakDowwn`, `policyDesscription` |
| `client/src/utils/CidrNotation.js` | `getNetworkInfo()` — IPv4/IPv6 CIDR calculation |
| `client/src/utils/Permissions.js` | Client-side permission checks (`isOrganizationAdmin`, `hasApplicationWriteAccess`, etc.) |
| `client/src/utils/MenuItems.js` | Menu structure, role-based filtering |
| `client/src/utils/Connection.js` | Connection data transform between client/server formats |
| `client/src/utils/Application.js` | Application data transform & validation |
| `client/src/utils/Manage.js` | Manage metadata helpers, protocol/status constants; `STATE` constant for `connection.state` |
| `client/src/connection/Testing.jsx` | Connection test/prod toggle UI; line 252 uses `connection.state === STATE.prodaccepted` |
| `client/src/components/UserFeedbackWidget.jsx` | Feedback modal with html2canvas screenshot |
| `client/src/components/ConfirmationDialog.jsx` | Reusable modal confirmation (supports `className`, `full` props) |
| `client/src/components/Entities.jsx` | Generic sortable/searchable entity table |
| `client/src/components/SelectField.jsx` | Wraps react-select with i18n |
| `client/src/locale/en.js` | English translations (~1242 lines) |
| `client/src/locale/nl.js` | Dutch translations (~1242 lines) |
| `client/src/locale/I18n.js` | i18n-js setup, language detection (param > cookie > navigator) |
| `client/sync-locales.js` | Standalone locale sync script |
| `client/src/__tests__/locale/en.test.js` | Locale key parity + ordering test |

---

## 13. TL;DR

- Federated access management platform connecting IdPs to SPs via `Manage` (SURFconext metadata registry)
- Spring Boot 3.5 backend (`server/`), React 19 + Zustand frontend (`client/`), MariaDB, Flyway migrations
- Auth is OIDC via SURFconext; authorization is programmatic in `UserAccessRights.java`, not annotation-based
- Role hierarchy: `superUser` > `institutionAdmin` > `ADMIN` > `MEMBER` > `GUEST` (`Authority.java` enum)
- Policies (reg + step-up) live in Manage, CRUD via `ManageController.java`, edited in `PolicyForm.jsx`
- Step-up policies use `loas[0]` with per-attribute `negated` flag; LoA options from `Config.acrValues`
- `Application.metaData` and `Connection.metaData` are JSON columns synced bidirectionally with Manage
- `Environment` enum is **gone** — single `manage.url`, `Connection.state` is the sole TEST/PROD signal
- `Connection.state` ≠ `Connection.status` — `state` is the Manage environment; `status` is the workflow stage
- `policyDesscription` and `policyBreakDowwn` in `Policy.js` have typos baked into all import sites
- Backend: 262 tests, 0 failures, 2 skipped. Frontend: 7 tests. `mvn` is at `/usr/local/bin/mvn`
- Locale files (`en.js`/`nl.js`) must stay key-synced; run `node sync-locales.js` after adding i18n keys
- WireMock: `POST /manage/api/internal/search/saml20_idp` stubs are consumed by `CustomOidcUserService` during OIDC auth for institution admins — must re-register after `openIDConnectFlow` returns (see Section 10)
