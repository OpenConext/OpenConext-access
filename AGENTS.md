# AGENTS.md — SURF Access (OpenConext-Access)

Guidance for AI coding agents. `CLAUDE.md` is a symlink to this file.

SURF Access is an IAM platform for Dutch education/research. Institutions (IdPs) own Applications (SAML SP / OIDC RP)
whose Connections are synced to **Manage**, SURFconext's metadata registry (source of truth for IdP/SP entities and policies).

- **Backend** `server/`: Spring Boot 4.2, Java 21, Maven, MariaDB, Flyway. Controller → Repository, no `service/` layer. Package root `access/`.
- **Frontend** `client/`: React 19, Vite, Zustand, plain JS/JSX (TypeScript only for `locale/en.ts`/`nl.ts`).

## Commands

MariaDB (localhost:3306, db/user `access`, password `secret`) and MinIO (localhost:9000) are always running locally.
**Never use `docker compose`** to run the app or tests.

```bash
cd server && mvn spring-boot:run           # port 8886
cd server && mvn test                      # JUnit 5 + WireMock + the local MariaDB
cd client && nvm use && yarn install && yarn dev   # port 3002, proxies /api/v1 to 8886
cd client && yarn test                     # Vitest
cd client && yarn lint
cd client && node sync-locales.js          # after adding i18n keys
```

`mvn` is at `/opt/homebrew/bin/mvn` if not on `PATH`. Config is Spring YAML profiles only: default, `local` (Swagger UI),
`devconf` (Manage replaced by static JSON).

## Domain model

- `User` → `OrganizationMembership` (authority `ADMIN`=2 / `MEMBER`=1 / `GUEST`=0) → `Organization` → `Application` → `Connection`.
- `ApplicationMembership` links an `OrganizationMembership` to an `Application`. **A GUEST only sees applications with an
  application membership**; members/admins see all. Count/list endpoints must respect this (see `OrganizationController`,
  `ApplicationController.countByOrganization`).
- `Application.metaData` / `Connection.metaData` are JSON columns (Hypersistence `JsonType`), synced with Manage.
- `Connection.state` (`testaccepted` default / `prodaccepted`) is the Manage environment and the sole TEST/PROD signal;
  `Connection.status` (`OPEN`, `IN_PROGRESS`, `COMPLETE`, `PENDING_PROD`, `PROD_READY`) is the internal workflow. Don't confuse them.
  `changeRequestRequired()` = `state == prodaccepted`. There is a single `manage.url` (no `Environment` enum).
- Policies live only in Manage (`ManageController`, DTOs in `access/manage/`). Regular policies use top-level `attributes`;
  step-up policies use a single `loas[0]` (no deny advice fields, per-attribute `negated`, CIDR notations). The format must match exactly.
- Roles for "SURFconext Invite (voot) role urn" policy attributes: `GET /api/v1/invite/roles-summary?organizationId=` (institution admins only).

## Backend conventions

- Authorization is programmatic via default methods on `UserAccessRights` (all controllers implement it), not `@PreAuthorize`.
  Hierarchy: `superUser` > `institutionAdmin` > `ADMIN` > `MEMBER` > `GUEST`. `User` arrives via `UserHandlerMethodArgumentResolver`
  (handles `X-IMPERSONATE-ID` for super users).
- `Manage`: `RemoteManage` (HTTP) and `LocalManage` (static JSON in `server/src/main/resources/manage/`, used by tests).
- Users/organizations are auto-provisioned on login; `UserController.me()` always calls `manage.identityProviderByEntityID` for non-external users.
- Entity serialization: `@JsonProperty(WRITE_ONLY)` on `@ManyToOne` fields, custom `READ_ONLY` getters returning flat maps.
- Lombok everywhere (IDE errors about generated methods are not real).
- `Config.java` has a copy constructor — add new config fields there too.
- Flyway migrations in `db/mysql/migration/`; `V2` is intentionally missing. Use the next free number.

## Frontend conventions

- Single Zustand store `stores/AppStore.js`; all API calls go through `api/index.js` (`validFetch` adds CSRF, language, impersonation headers).
- Every component has a co-located `.scss` (plain class names, shared vars in `styles/vars.scss`).
- `@surfnet/sds` / `@surfnet/curve-react` provide base UI and can't be modified. An SDS Checkbox must not be wrapped in a `<label>`.
- Menu visibility: `utils/MenuItems.js`; client permission checks: `utils/Permissions.js`.
- Trailing commas in JS objects. Functional components and hooks only.
- i18n: `locale/en.ts` and `nl.ts` must have identical keys in identical order (tested; run `node sync-locales.js`).
- Policy form: `policies/PolicyForm.jsx`, `pages/Policies.jsx`, `utils/Policy.js` (`groupByValues` / `flatMapByValues` convert
  between grouped form values and Manage's flat attributes). Exported typos `policyDesscription` / `policyBreakDowwn` are used everywhere — keep or rename everywhere.
- `components/ErrorIndicator.jsx` strips `?` from plain-text messages; use `decode={false}` for HTML messages.

## Mail templates

- Mustache in `server/src/main/resources/templates/`, rendered by `MailBox`; `myCustomizations/templates/` overrides any file.
- All styling is inline, only in `layout.html` and the `ui_*.html` partials. A mail is `<name>_{en,nl}.html` + `.txt` that only fills
  `{{<layout.html}}` blocks (`heading`, `content`, optional `preheader`/`signoff`) and composes `ui_button.html`, `ui_quote.html`,
  `ui_sender.html`. No `flex`, SVG or per-mail CSS.
- Logo is inline `cid:surfLogo`; `sendMail` adds `lang`/`nl`, `supportEmail`, `privacyUrl`, `productName`. Subjects are in `subjects.json`.
  `MailBoxTemplatesTest` renders all mails to `server/target/mail-preview/`.

## Testing

- Backend tests extend `AbstractTest` (WireMock, seed data via `doSeed()`, `openIDConnectFlow`, stub helpers). `CustomWireMockExtension`
  resets stubs after each test; leaking state means a missing stub registration.
- **WireMock stubs are consumed during OIDC login.** For institution admins, `CustomOidcUserService.loadUser()` calls
  `identityProvidersByInstitutionalGUID` (`POST /manage/api/internal/search/saml20_idp`), so a later `GET /api/v1/users/me` needs
  the IdP stub re-registered (last registered wins):

  ```java
  super.stubForIdentityProviderByInstitutionalGUID(ORGANISATION_GUID);   // OIDC phase
  super.stubForGetChangeRequests(getChangeRequests());
  AccessCookieFilter f = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
          institutionalAdminEntitlementOperator(ORGANISATION_GUID));
  super.stubForIdentityProviderByEntityId("http://mock-idp");            // re-register for /me
  super.stubForGetChangeRequests(getChangeRequests());
  ```
- `doSeed()` deletes `users` → `applications` → `organizations` → `joinRequests`; FKs cascade (`invitations` rely on that).
- Seed users: `SUPER_SUB` (superUser), `ADMIN_SUB`/`MANAGE_SUB` (ADMIN of ShareLogics), `GUEST_SUB` (MEMBER of FarWind),
  `EXTERNAL_USER_SUB` (GUEST of ShareLogics, one application membership), `MULTIPLE_ORG_SUB` (MEMBER of ShareLogics + Logistics, superUser),
  `INSTITUTION_ADMIN` (`organizationGUID=ORGANISATION_GUID`).
- Seed organizations: `ShareLogics` (manageIdentifier `7`, 2 applications), `Logistics` (`8`), `FarWind` (none). Mock IdP `http://mock-idp`
  (`_id` 7) has `coin:institution_guid` = `ORGANISATION_GUID` = `ad93daef-0911-e511-80d0-005056956c1a`.
- Frontend tests live in `__tests__/` subdirectories (Vitest).
