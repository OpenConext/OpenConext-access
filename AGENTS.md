# AGENTS.md — SURF Access (OpenConext-Access)

Guidance for AI coding agents. `CLAUDE.md` is a symlink to this file.

SURF Access is an identity & access management platform for Dutch education/research. Institutions (IdPs) own
Applications (SAML SP / OIDC RP) whose Connections are synced to **Manage**, SURFconext's external metadata registry
(the source of truth for IdP/SP entities and policies).

- **Backend**: `server/` — Spring Boot 3.5, Java 21, Maven, MariaDB, Flyway. Controller → Repository, no `service/` layer.
- **Frontend**: `client/` — React 19, Vite, Zustand, plain JS/JSX (no TypeScript, except the locale files `en.ts`/`nl.ts`).
- Java package root: `server/src/main/java/access/` (`api`, `manage`, `model`, `repository`, `security`, `invite`, `mail`, ...).

## Commands

```bash
docker compose up -d                       # MariaDB + Mailpit
cd server && mvn spring-boot:run           # port 8886
cd server && mvn test                      # JUnit 5 + WireMock + real MariaDB
cd client && nvm use && yarn install && yarn dev   # port 3002, proxies /api/v1 to 8886
cd client && yarn test                     # Vitest
cd client && yarn lint
cd client && node sync-locales.js          # after adding i18n keys
```

`mvn` may not be on `PATH` (e.g. `/opt/homebrew/bin/mvn` or `/usr/local/bin/mvn`). Config is only Spring YAML profiles
(no `.env`): default, `local` (Swagger UI), `devconf` (Manage replaced by static JSON).

## Domain model

- `User` → `OrganizationMembership` (authority `ADMIN`=2 / `MEMBER`=1 / `GUEST`=0) → `Organization` → `Application` → `Connection`.
- `ApplicationMembership` links an `OrganizationMembership` to an `Application`. **A GUEST only sees applications
  where they have an application membership**; members/admins see all applications of the organization. Any
  count/list endpoint must respect this (see `OrganizationController` and `ApplicationController.countByOrganization`).
- `Application.metaData` and `Connection.metaData` are JSON columns (Hypersistence `JsonType`), synced with Manage.
- `Connection.state` (`testaccepted` default / `prodaccepted`) is the Manage environment and the sole TEST/PROD signal.
  `Connection.status` (`OPEN`, `IN_PROGRESS`, `COMPLETE`, `PENDING_PROD`, `PROD_READY`) is the internal workflow.
  Do not confuse them. `changeRequestRequired()` = `state == prodaccepted`.
- There is a single `manage.url` — no TEST/PROD split, no `Environment` enum.
- Policies are not persisted locally; they live in Manage (`ManageController`, DTOs in `access/manage/`). Regular
  policies use top-level `attributes`; step-up policies always use a single `loas[0]` (no deny advice fields,
  per-attribute `negated`, CIDR notations). The Manage policy format must match exactly.
- Roles for "SURFconext Invite (voot) role urn" policy attributes come from `GET /api/v1/invite/roles-summary?organizationId=`
  (institution admins only).

## Backend conventions

- Authorization is programmatic via default methods on `UserAccessRights` (all controllers implement it), not `@PreAuthorize`.
  Hierarchy: `superUser` > `institutionAdmin` > `ADMIN` > `MEMBER` > `GUEST`. Controllers receive `User` through
  `UserHandlerMethodArgumentResolver` (handles `X-IMPERSONATE-ID` for super users).
- `Manage` interface: `RemoteManage` (HTTP) and `LocalManage` (static JSON in `server/src/main/resources/manage/`, used by tests).
- Users and organizations are auto-provisioned on login; `UserController.me()` always calls
  `manage.identityProviderByEntityID` for non-external users.
- Entity serialization: `@JsonProperty(WRITE_ONLY)` on `@ManyToOne` fields, custom `READ_ONLY` getters returning flat maps.
- Lombok everywhere (IDE/LSP errors about Lombok-generated methods are not real compile errors).
- `Config.java` has a copy constructor — add any new config field there too.
- Flyway migrations are in `db/mysql/migration/`; `V2` is intentionally missing — do not add it. Use the next free number.

## Frontend conventions

- Single Zustand store `stores/AppStore.js` (user, config, allowedAttributes, currentOrganization, flash, impersonator, ...).
  All API calls go through `api/index.js` (`validFetch` adds CSRF, language and impersonation headers).
- Every component has a co-located `.scss` file (plain class names, shared vars in `styles/vars.scss`).
- `@surfnet/sds` / `@surfnet/curve-react` provide base UI; their internals cannot be modified. An SDS Checkbox must not be wrapped in a `<label>`.
- Menu visibility is computed in `utils/MenuItems.js`; client-side permission checks in `utils/Permissions.js`.
- Trailing commas in JS objects. Functional components and hooks only.
- i18n: `locale/en.ts` and `locale/nl.ts` must have identical keys in identical order (enforced by a test; run
  `node sync-locales.js`). Keys are dot-separated and mirror the component structure.
- Policy form: `policies/PolicyForm.jsx` (edit), `pages/Policies.jsx` (overview + data transform), `utils/Policy.js`
  (`groupByValues` / `flatMapByValues` convert between the form's grouped values and Manage's flat attributes).
  The exported typos `policyDesscription` and `policyBreakDowwn` are used at all import sites — keep or rename everywhere.
- `components/ErrorIndicator.jsx` strips `?` from plain-text messages; use `decode={false}` for HTML messages (e.g. mailto links).

## Testing

- Backend tests extend `AbstractTest` (WireMock wiring, seed data via `doSeed()`, `openIDConnectFlow`, stub helpers).
  `CustomWireMockExtension` resets all stubs after each test; a leaking state means a missing stub registration.
- **WireMock stubs are consumed during OIDC login.** For institution-admin users, `CustomOidcUserService.loadUser()` calls
  `identityProvidersByInstitutionalGUID`, i.e. `POST /manage/api/internal/search/saml20_idp`, which uses up the stub.
  A later `GET /api/v1/users/me` needs that stub again:

  ```java
  super.stubForIdentityProviderByInstitutionalGUID(ORGANISATION_GUID);   // for the OIDC phase
  super.stubForGetChangeRequests(getChangeRequests());
  AccessCookieFilter f = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
          institutionalAdminEntitlementOperator(ORGANISATION_GUID));
  super.stubForIdentityProviderByEntityId("http://mock-idp");            // re-register for the explicit /me call
  super.stubForGetChangeRequests(getChangeRequests());
  ```

  Both IdP stubs hit the same URL without body matching; the last registered wins.
- `doSeed()` deletes `users` → `applications` → `organizations` → `joinRequests`; all FKs cascade, `invitations` rely on that.
- Seed users (`AbstractTest`): `SUPER_SUB` (superUser), `ADMIN_SUB`/`MANAGE_SUB` (ADMIN of ShareLogics),
  `GUEST_SUB` (MEMBER of FarWind), `EXTERNAL_USER_SUB` (GUEST of ShareLogics, one application membership),
  `MULTIPLE_ORG_SUB` (MEMBER of ShareLogics + Logistics, superUser), `INSTITUTION_ADMIN` (`organizationGUID=ORGANISATION_GUID`).
- Seed organizations: `ShareLogics` (manageIdentifier `7`, 2 applications), `Logistics` (`8`), `FarWind` (none).
  Mock IdP `http://mock-idp` (`_id` 7) has `coin:institution_guid` = `ORGANISATION_GUID` = `ad93daef-0911-e511-80d0-005056956c1a`.
- Frontend tests live in `__tests__/` subdirectories (Vitest); component coverage is minimal.
- CI (GitHub Actions) builds and tests both modules on push/PR to `main`.
