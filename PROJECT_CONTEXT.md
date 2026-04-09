# PROJECT_CONTEXT.md — SURF Access (OpenConext-Access)

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
| Flyway 11.20.3 | DB migrations (`db/mysql/migration/V1_0` through `V13_0`) |
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
- **Manage abstraction**: `Manage` interface with `RemoteManage` (HTTP to SURFconext) and `LocalManage` (static JSON files) implementations. Toggled by `manage.manageEnabled` property.
- **Auto-provisioning**: Users and org memberships created on first login.
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
- **SDS**: `@surfnet/sds` provides base UI components (Modal, Checkbox, Button, Chip, Tooltip, icons).

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
| **Manage** | REST API for IdP/SP metadata, policies, change requests | `manage.*` → `manage.test2.surfconext.nl` |
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
- `protocol` (enum: `saml20_sp`, `oidc10_rp`), `environment` (`TEST`, `PROD`), `state` (`testaccepted`, `prodaccepted`)
- `status` (enum: `OPEN`, `IN_PROGRESS`, `COMPLETE`, `PENDING_PROD`, `PROD_READY`), `secretSet`
- `createdAt`, `updatedAt` (`@PreUpdate` auto-set)
- **Relationship**: `application` (ManyToOne)
- **Transient**: `changeRequests`

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
| `Environment` | `TEST`, `PROD` |
| `FeatureName` | `idp`, `invite`, `sram`, `mfa` |

---

## 4. Important Code Paths

### User Login Flow

1. Browser → `/api/v1/users/login` → Spring redirects to OIDC authorization endpoint
2. SURFconext authenticates → callback to `/login/oauth2/code/oidcng`
3. `CustomOidcUserService.loadUser()` → looks up user by `sub` → checks institution admin entitlement → updates/creates user in DB
4. `UserHandlerMethodArgumentResolver` resolves `User` for subsequent requests
5. Client calls `GET /api/v1/users/me` → `UserController.me()` → auto-provisions org membership if `schacHomeOrganization` matches an org → returns enriched User (with transient `identityProvider`, `institution`, `changeRequests`)
6. Client stores user in Zustand, computes menu items based on roles

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

### Involved Classes

| Flow | Backend | Frontend |
|------|---------|----------|
| Login | `SecurityConfig`, `CustomOidcUserService`, `UserHandlerMethodArgumentResolver`, `UserController.me()` | `App.jsx`, `api/index.js:me()` |
| Policies | `ManageController`, `PolicyAccessRights`, `Manage` interface | `Policies.jsx`, `PolicyForm.jsx`, `PolicyOverview.jsx`, `PolicyChoiceDialog.jsx`, `Policy.js` |
| Connections | `ConnectionController`, `Manage.saveProvider()` | `Connection.jsx`, `connection/Overview.jsx`, `Connection.js` (utils) |
| Organizations | `OrganizationController`, `OrganizationRepository` | `Organization.jsx`, `organization/UserManagement.jsx` |

---

## 5. Current Work Focus

### What Was Built (recent commits on `main`)

1. **Step-up policy support** in `PolicyForm.jsx` — LoA selection from `config.acrValues`, per-attribute negation, CIDR with validation/auto-correct, separate step-up validation rules
2. **Mac Mail-style feedback widget** — `UserFeedbackWidget.jsx` captures screenshot via `html2canvas`, displays in a two-column preview modal
3. **Locale sync** — enabled the locale test, added missing i18n keys to both `en.js` and `nl.js`, created `sync-locales.js` script

### Key Modified Files

| File | Lines | What changed |
|------|-------|-------------|
| `client/src/policies/PolicyForm.jsx` | ~635 | Full step-up policy editing (LoA, attributes+negation, CIDR+validation) |
| `client/src/policies/PolicyForm.scss` | ~340 | Step-up styling sections |
| `client/src/utils/Policy.js` | ~159 | `groupByValues`/`flatMapByValues` preserve `negated`; `policyBreakDowwn`/`policyDesscription` handle step policies |
| `client/src/pages/Policies.jsx` | ~166 | `toPolicyDetail` groups step-up attributes |
| `client/src/components/UserFeedbackWidget.jsx` | ~234 | Screenshot capture + Mac Mail preview |
| `client/src/locale/en.js` | ~1242 | Added step-up + policy i18n keys |
| `client/src/locale/nl.js` | ~1242 | Same keys with Dutch translations |
| `client/sync-locales.js` | ~253 | Locale sync utility script |

### Decisions Already Made

- **Step-up policies always operate on `loas[0]`** — single LoA entry per policy
- **No MFA toggle dropdown** — explicitly skipped
- **No deny advice fields** for step-up policies
- **No server changes** for step-up — reuses existing `config.acrValues` and Manage policy API
- **LoA defaults to first `acrValues` entry** (loa1.5) for new step-up policies
- **Per-attribute negation** via "is any of"/"is none of" dropdown toggling `attribute.negated`
- **CIDR negation** via single dropdown controlling `loa.negateCidrNotation` for all CIDR entries
- **CIDR validation**: IPv4 prefix 8-32, IPv6 prefix 32-128, auto-correct on blur
- **SDS Checkbox** must NOT be wrapped in `<label>` (causes double-toggle)
- **Screenshot capture** runs in background, not blocking modal open

### Constraints

- `@surfnet/sds` component library is external — cannot modify its internals
- Manage API contract is fixed — policy structure must match Manage's expected format
- `Config.java` copy constructor must include any new config fields

---

## 6. Known Issues / Tech Debt

### Typos in Production Code
- `policyDesscription` (double 's') — `Policy.js:135`, imported in `PolicyForm.jsx`
- `policyBreakDowwn` (double 'w') — `Policy.js:85`, imported in `PolicyOverview.jsx`
- These are exported function names, so renaming requires updating all import sites.

### Formatting
- `sync-locales.js` normalizes file formatting when rewriting (strips comments, joins multi-line string concatenation, normalizes trailing commas). One comment `//Leave empty for no tips` in locale files will be lost on sync-rewrite.

### Pre-existing Java LSP Errors
- Multiple LSP errors in server files (`UserAccessRights.java`, `UserController.java`, `ApplicationController.java`, `ApplicationControllerTest.java`, etc.) — these are Lombok-generated method references that the LSP doesn't resolve. Not actual compilation errors.

### Test Coverage
- Only 5 test files / 7 tests on frontend (locale sync, utils, store). No component/integration tests.
- Backend tests exist in `server/src/test/java/access/` (JaCoCo configured).

### Database
- Flyway migration `V2` is missing (skipped from V1 to V3).

---

## 7. Setup & Run

### Prerequisites
- Java 21, Maven >= 3.9, Node 24.12 (`.nvmrc`), Yarn, Docker

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
cd server && mvn spring-boot:run

# 4. Client (port 3002, proxies API to 8886)
cd client && nvm use && yarn install && yarn dev
```

### Profiles

| Profile | DB | Notes |
|---------|-----|-------|
| (default) | `access` / `access:secret` | Manage enabled against `test2.surfconext.nl` |
| `local` | `access_local` / `root:` | JIRA staging enabled, Swagger UI enabled |
| `devconf` | `invite` / `inviterw:secret` | Port 8080, containerized MariaDB, Manage disabled (static JSON) |

### Config Highlights

- `application.yml`: `config.acrValues` (3 LoA URIs), `config.features` (idp, invite, sram, mfa), `config.clientUrl`, `config.feedbackWidgetEnabled`
- No `.env` files — all config via Spring YAML profiles
- Docker images: `ghcr.io/openconext/openconext-access/{accessclient,accessserver}` (multi-arch)

---

## 8. Conventions

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
- **Backend**: JUnit 5 + Spring Boot Test + WireMock + Testcontainers (MariaDB). JaCoCo for coverage. Run: `mvn test`
- **Locale test**: Verifies en/nl have identical keys in identical order. `sync-locales.js` for automated sync.
- **CI**: GitHub Actions on push/PR to `main` — builds both server and client, runs tests.

---

## 9. Open Questions

- Whether to rename the typo'd functions (`policyDesscription`, `policyBreakDowwn`) — requires coordinated rename across all import sites
- Whether `sync-locales.js` should be integrated into CI (e.g., fail build if locales are out of sync)
- Frontend test coverage is minimal — no component or integration tests exist

---

## 10. Useful File Map

### Backend

| File | Description |
|------|-------------|
| `server/pom.xml` | Maven config, all dependencies with versions |
| `server/src/main/resources/application.yml` | Main config (DB, OIDC, Manage, features, acrValues) |
| `server/src/main/resources/application-local.yml` | Local dev overrides |
| `server/src/main/resources/db/mysql/migration/` | Flyway migrations V1-V13 |
| `server/src/main/java/access/security/SecurityConfig.java` | Two filter chains, CSRF config, public endpoints |
| `server/src/main/java/access/security/CustomOidcUserService.java` | OIDC user enrichment + DB sync |
| `server/src/main/java/access/security/UserHandlerMethodArgumentResolver.java` | Resolves `User` from security context, handles impersonation |
| `server/src/main/java/access/api/UserAccessRights.java` | Programmatic authorization methods (default interface) |
| `server/src/main/java/access/api/UserController.java` | `/users/config`, `/users/me`, `/users/login`, user CRUD |
| `server/src/main/java/access/api/ManageController.java` | Policy CRUD, SP/IdP lookups, ARP/attributes |
| `server/src/main/java/access/api/ApplicationController.java` | Application CRUD, import, migrate |
| `server/src/main/java/access/api/ConnectionController.java` | Connection CRUD, secret reset, production status |
| `server/src/main/java/access/api/OrganizationController.java` | Organization CRUD, approval, search |
| `server/src/main/java/access/api/IdentityProviderController.java` | IdP connect/disconnect SPs |
| `server/src/main/java/access/api/InvitationController.java` | Invitation CRUD, accept, resend |
| `server/src/main/java/access/api/FeedbackController.java` | Feedback with screenshot submission |
| `server/src/main/java/access/manage/Manage.java` | Interface for Manage metadata registry |
| `server/src/main/java/access/manage/RemoteManage.java` | HTTP implementation of Manage |
| `server/src/main/java/access/manage/PolicyDefinition.java` | Policy DTO (reg + step-up) |
| `server/src/main/java/access/manage/LoA.java` | LoA model (level, attributes, cidrNotations) |
| `server/src/main/java/access/model/User.java` | User entity |
| `server/src/main/java/access/model/Organization.java` | Organization entity |
| `server/src/main/java/access/model/Application.java` | Application entity (has JSON metaData column) |
| `server/src/main/java/access/model/Connection.java` | Connection entity (has JSON metaData column) |
| `server/src/main/java/access/model/Authority.java` | ADMIN/MEMBER/GUEST enum with rights hierarchy |
| `server/src/main/java/access/config/Config.java` | `@ConfigurationProperties` — acrValues, features, clientUrl, etc. |

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
| `client/src/utils/Manage.js` | Manage metadata helpers, protocol/status constants |
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

## 11. If you only read this (TL;DR)

- Federated access management platform connecting IdPs to SPs via `Manage` (SURFconext metadata registry)
- Spring Boot 3.5 backend (`server/`), React 19 + Zustand frontend (`client/`), MariaDB, Flyway migrations
- Auth is OIDC via SURFconext; authorization is programmatic in `UserAccessRights.java`, not annotation-based
- Role hierarchy: `superUser` > `institutionAdmin` > `ADMIN` > `MEMBER` > `GUEST` (`Authority.java` enum)
- Policies (reg + step-up) live in Manage, CRUD via `ManageController.java`, edited in `PolicyForm.jsx`
- Step-up policies use `loas[0]` with per-attribute `negated` flag; LoA options from `Config.acrValues`
- `Application.metaData` and `Connection.metaData` are JSON columns synced bidirectionally with Manage
- `policyDesscription` and `policyBreakDowwn` in `Policy.js` have typos baked into all import sites
- Frontend has only 7 tests (`client/src/__tests__/`); backend uses JUnit + WireMock + Testcontainers
- Locale files (`en.js`/`nl.js`) must stay key-synced; run `node sync-locales.js` after adding i18n keys
