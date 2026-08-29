# Security Audit — OpenConext Access

**Scope:** Full client (`client/src`, React) and server (`server/src/main/java/access`, Spring Boot/Spring Security, OAuth2/OIDC, SAML, JPA/MariaDB) codebase.
**Method:** Three independent LLM-driven audit passes covering the OWASP Top 10 (authorization, information leakage, injection, auth/session, XSS, SSRF, misconfiguration), followed by manual verification of every Critical/High finding against the actual source (line-by-line read, not re-summarized from the passes). Findings that did not survive verification are noted at the bottom rather than silently dropped.
**Out of scope / not performed:** dependency CVE scanning, dynamic testing (DAST), infrastructure/deployment config outside this repo (Helm charts, CI/CD, cloud IAM).
**Date:** 2026-08-29
**Remediation:** All findings below were subsequently fixed on branch `audit-findngs` (see "Remediation" column and per-finding notes). `mvn clean install` passes (333 tests, including new regression tests for findings #1, #2, #3, #6, #8), and fixes were spot-checked against the running dev-profile server + client.

---

## Summary

| # | Finding | Severity | Status | Remediation |
|---|---|---|---|---|
| 1 | Unauthenticated disclosure of OAuth/OIDC client secrets via public endpoint | **Critical** | Verified | **Fixed** — secrets stripped from `PublicController` response ([PublicControllerTest.java](server/src/test/java/access/api/PublicControllerTest.java) regression test added) |
| 2 | IDOR via mass assignment: any org member can hijack another org's Application/Connection | **Critical** | Verified | **Fixed** — client-supplied `id` rejected on create (Application/Connection/Contract); regression test added |
| 3 | Vertical privilege escalation: plain org MEMBER can demote/promote org ADMINs | **Critical** | Verified | **Fixed** — `ADMIN` required unconditionally to change another member's authority; regression test added |
| 4 | Live third-party API key committed to public git repository | **High** | Verified | **Fixed in repo** — key replaced with placeholder, `ohdear.enabled` defaulted to `false`. **Operator action still required:** rotate the leaked OhDear key (still valid until rotated at the provider) and scrub git history |
| 5 | Invitation acceptance does not verify accepting user's identity against the invitee | **High** | Verified | **Fixed** — email match enforced in `InvitationController.accept` |
| 6 | GUEST-level org member can delete any user's application membership | **High** | Verified | **Fixed** — raised to `MEMBER`; regression test added |
| 7 | Connection secrets returned unredacted to GUEST-level application members | **Medium** | Verified | **Fixed** — raised to `MEMBER` in `ConnectionController.find`/`findByManage` |
| 8 | Anonymous callers get unrestricted (super-user-equivalent) login statistics | **Medium** | Verified | **Fixed** — anonymous callers restricted to the platform-wide aggregate (no `spEntityId`); regression tests added |
| 9 | SSRF protection subject to DNS-rebinding TOCTOU | **Medium** | Verified (design-level) | **Fixed** — DNS resolution pinned via a custom Apache HttpClient5 `DnsResolver`, so validation and the actual connection use the same resolved address |
| 10 | Unescaped HTML in transactional emails (`{{{message}}}`) | **Medium** | Verified | **Fixed** — templates use escaped `{{message}}` + CSS `white-space: pre-line` |
| 11 | Unsanitized user input concatenated into outbound Jira REST URL | **Medium** | Verified | **Fixed** — `ticketKey` validated against `^[A-Z][A-Z0-9]*-[0-9]+$` before use |
| 12 | Verbose `/error` responses leak exception class/message | **Low** | Verified | **Fixed** — only the app's own client-facing exceptions expose their message; everything else returns a generic message (full detail still logged server-side) |
| 13 | Actuator `/internal/health` exposes full component details anonymously | **Low** | Verified | **Fixed** — `show-details: when-authorized` |
| 14 | Unreferenced private key file committed to git | **Low** | Verified | **Fixed in repo** — file removed (`git rm`). **Operator action still required:** scrub git history if this key was ever paired with a live certificate elsewhere |
| 15 | No size/type validation before decoding+processing base64 logo uploads | **Low** | Verified | **Fixed** — size caps + header-only dimension check before `Thumbnails` decodes pixel data |
| 16 | No audit log entry for super-user impersonation via `X-IMPERSONATE-ID` | **Low** | Verified | **Fixed** — impersonation now logged (real actor + impersonated user) |
| 17 | Dead-code XSS sink (`CollapseField.jsx`) missing `DOMPurify` | **Low** | Verified | **Fixed** — wrapped in `DOMPurify.sanitize` |
| 18 | Dev/test auth-bypass filters routed openly, gated only by runtime profile check | **Informational** | Verified | **Mitigated** — loud startup `WARN` banner added when `dev` profile is active; routing/profile-gating logic unchanged (already correct) |
| 19 | Weak default Basic-Auth credentials for lifecycle deprovisioning API | **Informational** | Verified | **Mitigated** — startup `WARN` if the shipped default password is still active outside `dev`/`test` |
| 20 | Public monitoring endpoint discloses internal service names/URLs | **Informational** | By design, flagged for confirmation | **No change** — confirmed intentional public status-page feature; not a defect |

A fix note also corrects finding #1's scope: the raw Manage provider metadata schema is externally defined and extensible, so redaction was implemented as a case-insensitive pattern match (`secret|password|private.?key`) rather than an exact-name allowlist — this was verified to also catch a second real secret field (`clientSecretJWT`) present in the test fixtures that an exact-name allowlist would have missed.

A note on a **discarded finding**: two of the three passes reported a "Jira API key and Manage/Invite passwords committed to `application-local.yml`." This was checked and is **incorrect** — `application-local.yml` is not tracked by git (`.gitignore:48`, confirmed via `git ls-files`); it exists only as an untracked local file on this machine and was evidently misread by those passes as committed. It is not included above. The one committed credential that *is* real is the OhDear API key (finding #4).

---

## Critical

### 1. Unauthenticated disclosure of OAuth/OIDC client secrets via public endpoint

- **Location:** [`server/src/main/java/access/api/PublicController.java:62-83`](server/src/main/java/access/api/PublicController.java) (`serviceProviderDetail`), backed by [`RemoteManage.java:81-88`](server/src/main/java/access/manage/RemoteManage.java) and [`Manage.java:88-96`](server/src/main/java/access/manage/Manage.java) (`sanitizeProvider`)
- **Description:** `GET /api/v1/public/service-provider-detail/{type}/{identifier}` is listed under `/api/v1/public/**`, which is `permitAll()` in [`SecurityConfig.java:118`](server/src/main/java/access/security/SecurityConfig.java) — fully unauthenticated. It fetches the *complete* provider record straight from Manage (`GET /manage/api/internal/metadata/{type}/{id}`) via `providerByManageIdentifier`. The only scrubbing applied anywhere on this path is `sanitizeProvider` (which merely normalizes `id`/`_id`) and, in the controller itself, removal of keys prefixed `contacts:`. The `secret`/`originalSecret` metadata fields — which for an `oidc10_rp` provider hold the live OAuth/OIDC client secret (see `Connection.java`, which populates `metaData.put("secret", metaDataFields.get("secret"))` from this exact same Manage structure) — are **never removed**. `ManageData.removeSecrets(...)` exists and is used elsewhere ([`ApplicationController.java:181`](server/src/main/java/access/api/ApplicationController.java), [`OrganizationController.java:120`](server/src/main/java/access/api/OrganizationController.java)) precisely to strip these fields before returning data to clients, but it is never called on this endpoint.
  The `identifier` needed is discoverable from the sibling public endpoint `GET /api/v1/public/service-providers` (`serviceProvidersLight`), so no prior knowledge is required beyond a provider not being flagged `coin:ss:hidden`.
- **Evidence:**
  ```java
  Map<String, Object> provider = manage.providerByManageIdentifier(entityType, identifier);
  Set<String> allowedEntities = allowedEntities(authentication, null);
  if (removeNonPublicProvider(provider, allowedEntities)) {
      return forbiddenResult();
  }
  getMetaDataFields(getData(provider)).keySet()
      .removeIf(key -> key.startsWith("contacts:"));   // "secret" is NOT removed
  return ResponseEntity.ok(provider);
  ```
- **Impact:** Any unauthenticated internet client can retrieve the plaintext OAuth2/OIDC client secret for any non-hidden registered service provider, enabling full impersonation of that client against the identity platform.
- **Recommendation:** Strip `secret`/`originalSecret` (and any other credential-bearing `metaDataFields` keys) from the response in `serviceProviderDetail`, the same way `ManageData.removeSecrets` does elsewhere — ideally by building a dedicated public-safe projection rather than returning the raw Manage payload.

### 2. IDOR via mass assignment: any org member can hijack another organization's Application or Connection

- **Location:** [`server/src/main/java/access/api/ApplicationController.java:186-208`](server/src/main/java/access/api/ApplicationController.java) (`create`), [`server/src/main/java/access/api/ConnectionController.java:155-173`](server/src/main/java/access/api/ConnectionController.java) (`create`); entity definitions [`Application.java:22-30`](server/src/main/java/access/model/Application.java), [`Connection.java:36-45`](server/src/main/java/access/model/Connection.java)
- **Description:** `Application` and `Connection` are `@Entity` classes with a class-level Lombok `@Setter`, an `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` field with no `@JsonIgnore`/`@JsonProperty(access = READ_ONLY)` guard, and **no `@Version`** field. Both `create()` endpoints bind the entity directly from `@RequestBody` and pass it straight to `repository.save(...)`.
  Spring Data JPA's `SimpleJpaRepository.save()` decides `persist()` vs `merge()` using `entityInformation.isNew(entity)`. With no `@Version` field, `isNew()` is based purely on whether `id` is `null`. Because the client can set `id` on the JSON body, supplying an **existing** id causes `isNew()` to return `false`, so Spring Data calls `entityManager.merge(entity)` — an **UPDATE of that existing row** — instead of inserting a new one.
  - `ApplicationController.create`: authorization is checked against `application.getOrganization()`, which is itself taken from the request body (`Organization` field is `@JsonProperty(access = WRITE_ONLY)`, i.e. bindable from JSON). An attacker who is a `MEMBER` of their **own** organization can submit `POST /api/v1/applications` with `id: <victim's application id>` and `organization: {id: <attacker's own org>}`. The authorization check passes (it only validates the attacker's real membership in their own org), and `save()` then overwrites the **victim's existing application row**, reassigning its `organization` FK to the attacker's org.
  - `ConnectionController.create`: `applicationID` is read from the attacker-controlled `connection.getApplication().getId()`, `confirmApplicationWriteAccess` is checked against that (attacker-owned) application, and the real `Application` object is re-attached — but `connection.getId()` is still attacker-controlled. Supplying `id: <victim's connection id>` causes `save()` to `merge()`-UPDATE that connection, reassigning it (and its `metaData.secret`) to the attacker's own application.
- **Evidence:**
  ```java
  // ApplicationController.create
  Organization organization = application.getOrganization();     // attacker-supplied
  confirmOrganizationMembership(user, organization, Authority.MEMBER); // checks attacker's OWN org only
  ...
  Application applicationSaved = applicationRepository.save(application); // id from body -> merge() = UPDATE of arbitrary row
  ```
- **Impact:** A low-privileged member of any single organization can silently take over an arbitrary application or connection belonging to a completely different organization, including its OAuth/OIDC client secret (readable afterwards — see finding #7).
- **Recommendation:** Never bind entities with server-generated ids directly from `@RequestBody` on create endpoints. Use a dedicated creation DTO without an `id` field (as is already correctly done for `Organization.create`), or explicitly null out `id` before `save()` on create paths. Add `@Version` for defense in depth (it does not by itself fix this, but prevents silent lost-update overwrites).

### 3. Vertical privilege escalation: a plain org MEMBER can demote/promote org ADMINs

- **Location:** [`server/src/main/java/access/api/OrganizationMembershipController.java:54-72`](server/src/main/java/access/api/OrganizationMembershipController.java) (`update`)
- **Description:** `PUT /api/v1/organization_memberships` binds `OrganizationMembership` directly from the request body and looks up the authorization requirement from the **attacker-supplied target authority**, not from the caller's own privilege relative to the membership being changed:
  ```java
  Authority newAuthority = organizationMembershipUpdate.getAuthority();
  Authority requiredAuthority = Authority.ADMIN.equals(newAuthority) ? Authority.ADMIN : Authority.MEMBER;
  confirmOrganizationMembership(user, organizationMembership.getOrganization(), requiredAuthority);
  ...
  organizationMembership.setAuthority(newAuthority);
  ```
  Since `Authority.isAllowed` is a `rights >= other.rights` check (`ADMIN=2, MEMBER=1, GUEST=0`), a caller who is merely a `MEMBER` (rights=1) satisfies `requiredAuthority = MEMBER` whenever `newAuthority != ADMIN`. This means a plain MEMBER can call this endpoint targeting **any other membership id in the org**, including an existing ADMIN's, with `authority: "MEMBER"` — and the code applies it unconditionally (`organizationMembership.setAuthority(newAuthority)`), demoting that ADMIN. The only guard is the "last admin" check, which only blocks the demotion when fewer than 2 admins remain — so as long as ≥2 admins exist, any MEMBER can strip administrative rights from other admins, or elevate a GUEST to MEMBER.
- **Impact:** Low-privileged organization members can strip administrative control from legitimate admins or grant themselves/others elevated membership, entirely bypassing the intended ADMIN-only membership-management model.
- **Recommendation:** Base the required authority on the *caller's* rights needed to modify *any* other member's authority (i.e., require `ADMIN` unconditionally for changing someone else's `authority`), not on the client-supplied target value. Avoid binding the full JPA entity from the request body; use a DTO with just `id` and `authority`.

---

## High

### 4. Live third-party API key committed to a public git repository

- **Location:** [`server/src/main/resources/application.yml:211-217`](server/src/main/resources/application.yml)
- **Description:** This repository is `OpenConext/OpenConext-access` on public GitHub (`git remote -v`). `application.yml` is tracked by git (confirmed via `git ls-files`) and is loaded by default (no profile required). It contains a real, enabled OhDear uptime-monitoring API key:
  ```yaml
  ohdear:
    apiKey: "yZo9T959IX6oeUwPi21wvxlKWA3ZkclsQ8l9Q17r78ee8227"
    baseUrl: "https://ohdear.app/api"
    enabled: true
  ```
  A commented-out line just above it (`#  apiKey: "test-token"`) shows this replaced an intentional placeholder with what appears to be a real credential. Anyone who has ever cloned or viewed this public repository has this key.
- **Recommendation:** Rotate the OhDear API key immediately. Move it (and any other real secret) to an environment variable or secret manager, and keep only obviously-fake placeholders in files shipped with the repo. Consider scrubbing git history and adding a secret-scanning pre-commit/CI check to prevent recurrence.
- **Note:** The `jira.api-key` value in this same file is the literal placeholder `secret` (not a real credential) — confirmed not sensitive. See the "discarded finding" note above regarding a separate, incorrect claim about `application-local.yml`.

### 5. Invitation acceptance does not verify the accepting user's identity against the invitee

- **Location:** [`server/src/main/java/access/api/InvitationController.java:145-184`](server/src/main/java/access/api/InvitationController.java) (`accept`)
- **Description:** `PUT /api/v1/invitations/accept` looks up the `Invitation` solely by `(invitationId, hash)` (`invitationRepository.findByIdAndHash`) and then grants the **currently authenticated** user an `OrganizationMembership` at `invitation.getIntendedAuthority()` — which can be `ADMIN`. At no point does the method check that `user.getEmail()` (or any other identity claim) matches the invitation's intended invitee. The hash is generated from 128 bytes of `SecureRandom` ([`HashGenerator.java`](server/src/main/java/access/config/HashGenerator.java)), so brute-forcing it is infeasible — but the design relies entirely on the invite link staying private to its intended recipient. If the link leaks through any channel not fully controlled by the recipient (forwarded email, shared inbox, browser history sync, a referrer header, a screenshot), **any other already-authenticated user** of the platform who obtains it can accept it under their own account and become an ADMIN of an organization they have no legitimate relationship to.
- **Evidence:**
  ```java
  Invitation invitation = invitationRepository.findByIdAndHash(acceptInvitation.invitationId(), acceptInvitation.hash())
          .orElseThrow(() -> new NotFoundException("Invitation not found"));
  invitation.accept();
  user = reinitializeUser(user, userRepository);
  ...
  OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, invitation.getIntendedAuthority());
  ```
- **Recommendation:** Verify the authenticated user's email (case-insensitively) matches `invitation.getEmail()` before granting membership, or otherwise require the invitee to prove they are the intended recipient before the membership is created.

### 6. GUEST-level org member can delete any user's application membership

- **Location:** [`server/src/main/java/access/api/ApplicationMembershipController.java:71-82`](server/src/main/java/access/api/ApplicationMembershipController.java) (`delete`)
- **Description:** `DELETE /api/v1/application_memberships/{membership_id}` only requires `Authority.GUEST` (`confirmOrganizationMembership(user, ..., Authority.GUEST)`). Since `Authority.isAllowed` is `rights >= other.rights` and `GUEST` has `rights=0`, **every** member of the organization — regardless of their own authority tier — satisfies this check. The membership id comes solely from the URL path; there is no check that the caller has any relationship to the specific membership being deleted. This means the lowest-privileged role in the system (GUEST) can revoke **any other member's** application access within the same organization. It is inconsistent with the sibling `create` endpoint in the same controller (line 58), which correctly requires `Authority.MEMBER`.
- **Evidence:**
  ```java
  ApplicationMembership applicationMembership = this.applicationMembershipRepository.findById(membershipId)...
  confirmOrganizationMembership(user, applicationMembership.getOrganizationMembership().getOrganization(), Authority.GUEST);
  applicationMembershipRepository.delete(applicationMembership);
  ```
- **Recommendation:** Require at least `Authority.MEMBER` (matching `create`), or restrict deletion to the membership's owner or an `ADMIN`.

---

## Medium

### 7. Connection secrets returned unredacted to GUEST-level application members

- **Location:** [`server/src/main/java/access/api/ConnectionController.java:109-153`](server/src/main/java/access/api/ConnectionController.java) (`find`, `findByManage`)
- **Description:** `ApplicationController.find()` explicitly strips `secret`/`originalSecret` via `ManageData.removeSecrets(application)` before returning application data (line 181), and `OrganizationController.findOrganizationDetailById` does the same. `ConnectionController.find()` / `findByManage()`, however, return the `Connection` entity directly with no redaction, and both only require `Authority.GUEST` — the lowest privilege tier — via `confirmApplicationWriteAccess(user, application, Authority.GUEST)`. A GUEST-level application member (and, combined with finding #2, an attacker who has "stolen" a connection into their own application) can read the live OAuth/OIDC client secret. This may be an intentional design (the connection detail view is presumably where an admin is meant to copy the secret for client configuration — the client UI does render `connection.originalSecret` in an input field), but the inconsistency with the redaction applied elsewhere, combined with GUEST being the lowest tier, is worth explicit confirmation.
- **Recommendation:** If GUESTs are not meant to see credentials, raise the minimum authority for `find`/`findByManage`/`changeRequests`/`reset-secret` to `MEMBER` or `ADMIN`, or apply the same `removeSecrets` scrubbing used elsewhere for callers below that tier.

### 8. Anonymous callers get unrestricted (super-user-equivalent) login statistics

- **Location:** [`server/src/main/java/access/api/StatisticsController.java:29-53`](server/src/main/java/access/api/StatisticsController.java), permitAll rule in [`SecurityConfig.java:120`](server/src/main/java/access/security/SecurityConfig.java), null-user handling in [`UserHandlerMethodArgumentResolver.java:55-57`](server/src/main/java/access/security/UserHandlerMethodArgumentResolver.java)
- **Description:** `/api/v1/stats/loginTimeFrame` is listed in `permitAll()`, and the argument resolver explicitly returns `null` for `User` on that path instead of throwing `UserRestrictionException`. `resolveIdpEntityId(User user)` treats `user == null` identically to `user.isSuperUser()`:
  ```java
  private String resolveIdpEntityId(User user) {
      if (user == null || user.isSuperUser()) {
          return null;   // null => statistics.loginTimeFrame() returns data for ALL IdPs
      }
      ...
      return user.getAuthenticatingAuthority();  // authenticated non-owner users ARE correctly scoped
  }
  ```
  The method's own doc comment states the per-IdP restriction is "always enforced server-side" — true for authenticated non-owner users, but not for anonymous ones, which fall into the same unrestricted branch reserved for super/owner users. Any unauthenticated caller can retrieve login-count statistics for an arbitrary `spEntityId` across every IdP on the platform.
- **Recommendation:** Treat `user == null` as the *most* restrictive case (deny, or scope to a safe aggregate default), not as equivalent to a super user.

### 9. SSRF protection subject to DNS-rebinding TOCTOU

- **Location:** [`server/src/main/java/access/api/ManageController.java:139-235`](server/src/main/java/access/api/ManageController.java) (`parse`, `assertPublicHost`, `fetchBoundedUrlContent`)
- **Description:** `POST /api/v1/manage/parse` fetches an attacker-supplied URL server-side to import SAML/OIDC metadata. Defenses are otherwise solid: scheme allowlisting, blocking of loopback/link-local/site-local/multicast/ULA addresses, redirect-hop re-validation, and a response size cap. However, `assertPublicHost` resolves the hostname via `InetAddress.getAllByName(host)` once for validation; the actual fetch (`HttpURLConnection`) performs its own, independent DNS resolution when it connects. An attacker controlling DNS for the submitted hostname can return a public IP for the validation lookup and a private/internal address (e.g. a cloud metadata endpoint) for the real connection moments later, bypassing the guard (classic TOCTOU/DNS-rebinding). This is reachable by any authenticated user (the endpoint has no `User` parameter or org-scoping check at all).
- **Recommendation:** Resolve the hostname once, validate the resolved IP, then connect directly to that pinned IP address rather than letting the HTTP client re-resolve DNS at connect time. Apply the same pinning on every redirect hop.

### 10. Unescaped HTML in transactional emails

- **Location:** [`server/src/main/resources/templates/invitation_en.html:28`](server/src/main/resources/templates/invitation_en.html), [`connection_request_en.html:27`](server/src/main/resources/templates/connection_request_en.html) (and `_nl` equivalents), fed from [`MailBox.java`](server/src/main/java/access/mail/MailBox.java)
- **Description:** The invitation and connection-request Mustache templates render the user-supplied "personal message" field with triple-stash `{{{message}}}`, which disables Mustache's default HTML escaping. `MailBox` only substitutes `\n` → `<br/>` before rendering; the rest of the string (fully attacker/user-controlled free text) passes through unescaped into HTML emails sent to institution admins and invitees.
- **Recommendation:** Use double-stash `{{message}}` (escaped) and perform the newline-to-`<br/>` substitution on the escaped output, or render with CSS `white-space: pre-line` instead of manual HTML injection.

### 11. Unsanitized user input concatenated into outbound Jira REST URL

- **Location:** [`server/src/main/java/access/jira/JiraClient.java:98-109`](server/src/main/java/access/jira/JiraClient.java) (`comment`), triggered from [`ManageController.java`](server/src/main/java/access/api/ManageController.java) (`rejectChangeRequest`)
- **Description:** `rejectChangeRequest` binds `ChangeRequest` directly from `@RequestBody`; its `getTicketKey()` value (fully attacker-controlled) is passed into `JiraClient.comment`, which builds the request URL via raw string concatenation:
  ```java
  String commentUrl = jiraConfig.getBaseUrl() + "/issue/" + jiraKey + "/comment";
  ```
  An authenticated user with write access to any single application (the only gate on this path, via `confirmApplicationWriteAccess`) can supply a crafted `ticketKey` (e.g. containing path-traversal segments) to redirect this authenticated POST to a different path on the Jira host, potentially invoking unintended Jira REST operations using the application's own Jira credentials.
- **Recommendation:** Validate `ticketKey` against an expected format (e.g. `^[A-Z]+-\d+$`) before use, and/or build the URL with `UriComponentsBuilder` path-segment encoding instead of concatenation.

---

## Low

### 12. Verbose `/error` responses leak exception class/message

- **Location:** [`server/src/main/java/access/api/DefaultErrorController.java:46-56`](server/src/main/java/access/api/DefaultErrorController.java), `server.error.include-message: always` in [`application.yml:7-9`](server/src/main/resources/application.yml)
- **Description:** The custom `/error` handler always includes `ErrorAttributeOptions.Include.EXCEPTION` and `MESSAGE` in the JSON error body for every unhandled exception — not gated by environment/profile. No stack trace is returned, but the exception class name and `.getMessage()` are, which for e.g. `DataIntegrityViolationException` or other unchecked JDBC/Hibernate errors can surface internal table/column names or other implementation detail.
- **Recommendation:** Whitelist a curated set of exception types allowed to expose their message to clients; return a generic message for everything else. Consider `server.error.include-message: on_param`/`never` in production.

### 13. Actuator `/internal/health` exposes full component details anonymously

- **Location:** [`application.yml:233-247`](server/src/main/resources/application.yml) (`show-details: always`, `access: unrestricted`), permitAll entry in [`SecurityConfig.java:125`](server/src/main/java/access/security/SecurityConfig.java)
- **Description:** `management.endpoint.health.show-details: always` combined with unrestricted access and `permitAll()` routing means any unauthenticated caller receives per-component health detail (DB, disk, mail, etc., depending on what's on the classpath) rather than just an aggregate UP/DOWN — minor reconnaissance value for an attacker.
- **Recommendation:** Set `show-details: when-authorized`, or restrict the endpoint to internal networks only.

### 14. Unreferenced private key file committed to git

- **Location:** [`server/src/main/resources/private_key_pkcs8.pem`](server/src/main/resources/private_key_pkcs8.pem)
- **Description:** A full PKCS8 RSA private key is tracked in the repository. No reference to this filename was found anywhere in `server/src/main/java` (`grep -rn "private_key_pkcs8\|pkcs8"` returns nothing), suggesting it is currently unused, but its presence in git history is still a latent risk if it was ever paired with a live certificate (SAML signing, JWT signing, TLS) inside or outside this repo.
- **Recommendation:** Confirm the key's provenance and whether any deployment overlay uses it. If unused, remove it and scrub git history. If used, rotate it and move it to a secret store.

### 15. No size/type validation before decoding and processing base64 logo uploads

- **Location:** [`server/src/main/java/access/api/S3Storage.java:61-88`](server/src/main/java/access/api/S3Storage.java), invoked from [`ApplicationController.java:241-247`](server/src/main/java/access/api/ApplicationController.java)
- **Description:** `ApplicationController.update()` passes a client-supplied base64 `logoUrl` string into `S3Storage.uploadFile()`, which decodes it and feeds it straight into `Thumbnails.of(inputStream)` with no upper bound on decoded size and no content-type check before processing. A user with application write access could submit an oversized or crafted payload to consume server memory/CPU (decompression-bomb-style DoS).
- **Recommendation:** Enforce a maximum decoded payload size and validate the image format/dimensions before invoking `Thumbnails`.

### 16. No audit log entry for super-user impersonation via `X-IMPERSONATE-ID`

- **Location:** [`UserHandlerMethodArgumentResolver.java:81-88`](server/src/main/java/access/security/UserHandlerMethodArgumentResolver.java)
- **Description:** Super-users can impersonate any user by ID via the `X-IMPERSONATE-ID` header; non-super-users are correctly blocked. However, no explicit audit-log entry records that impersonation occurred (real actor + impersonated user id) — downstream controllers only log the resolved (impersonated) user's own identity, making it hard to reconstruct after the fact whether an action was performed by the real actor or via impersonation.
- **Recommendation:** Add an explicit audit-log entry (real super-user subject + impersonated user id) whenever the `X-IMPERSONATE-ID` path is used.

### 17. Dead-code XSS sink missing `DOMPurify`

- **Location:** [`client/src/components/CollapseField.jsx:36-37`](client/src/components/CollapseField.jsx)
- **Description:** Every other `dangerouslySetInnerHTML` usage in the client wraps its content in `DOMPurify.sanitize(...)`; `CollapseField` renders its `info` prop directly, unsanitized. No current caller passes `info=` to this component (`grep -rn "<CollapseField" client/src` finds no usages outside its own definition), so it is dead code today, but it is a latent XSS sink if reintroduced with an untrusted source string.
- **Recommendation:** Add `DOMPurify.sanitize(info)` for consistency, or remove the unused component.

---

## Informational

### 18. Dev/test auth-bypass filters routed openly, gated only by a runtime profile check

- **Location:** [`LocalDevelopmentAuthenticationFilter.java`](server/src/main/java/access/security/LocalDevelopmentAuthenticationFilter.java), wired in [`SecurityConfig.java:142-145`](server/src/main/java/access/security/SecurityConfig.java); [`LoginController.java:35-51`](server/src/main/java/access/api/LoginController.java) (`/api/v1/test/login`)
- **Description:** `LocalDevelopmentAuthenticationFilter` (full auth bypass, auto-authenticates as `urn:collab:person:example.com:admin`, a super-admin per `application.yml`'s `super-admin.users`) is only *registered* when Spring's `dev` profile is active; `/api/v1/test/login` (accepts arbitrary claims including `sub`) checks the `test` profile at request time and throws otherwise. Both checks are correctly implemented in code. However, the *routes themselves* are always present in the `permitAll`/CSRF-exempt list regardless of profile — only the in-handler runtime check prevents exploitation. Nothing in this repo sets `SPRING_PROFILES_ACTIVE`; that control lives in deployment configuration outside this repository's visibility, so it could not be verified end-to-end here.
- **Recommendation:** Confirm at the deployment/orchestration layer that `dev`/`test` profiles are never active in any production or externally reachable environment. Consider an additional fail-fast startup check (e.g., refuse to start if `dev`/`test` is combined with a production-looking config value).

### 19. Weak default Basic-Auth credentials for the lifecycle deprovisioning API

- **Location:** [`application.yml:84-86`](server/src/main/resources/application.yml) (`lifecycle.user: lifecycle`, `lifecycle.password: secret`), enforced in [`SecurityConfig.java:158-185`](server/src/main/java/access/security/SecurityConfig.java), consumed by [`UserLifeCycleController.java`](server/src/main/java/access/lifecycle/UserLifeCycleController.java)
- **Description:** The tracked default configuration ships a trivially guessable Basic-Auth credential (`lifecycle`/`secret`) for the `ROLE_LIFECYCLE`-gated `/api/external/v1/deprovision/**` endpoints, which return PII (email, name, `eduPersonPrincipalName`, `schacHomeOrganization`) and can permanently delete user accounts. Presumably overridden via environment variables in real deployments, but its presence as a checked-in default is a risk if any environment is ever misconfigured to use the shipped default.
- **Recommendation:** Ensure production configuration always overrides this value; consider failing startup if the default is detected outside `dev`/`test` profiles.

### 20. Public monitoring endpoint discloses internal service names/URLs

- **Location:** [`OhDearController.java`](server/src/main/java/access/api/OhDearController.java) (`/api/v1/monitoring`, `permitAll` per `SecurityConfig.java:121`), [`OhDearService.java`](server/src/main/java/access/ohdear/OhDearService.java)
- **Description:** This appears to be an intentional public status-page feature (results cached via `@Cacheable`, mitigating upstream cost amplification), but it does expose internal service naming/URLs to unauthenticated callers. Flagged only for explicit confirmation that none of the monitored URLs are meant to stay non-public.

---

## Areas reviewed with no significant findings

- **XXE:** `MetaDataFeedParser.importXML()` explicitly disables DOCTYPE declarations, external entities, and XInclude before parsing SAML metadata XML — well hardened.
- **SQL/JPQL injection:** All repository `@Query` methods reviewed use bound parameters (`?1`, `:param`); `FullSearchQueryParser` sanitizes free-text input but the result is still passed as a bound parameter, never concatenated into query text.
- **CSRF:** Enabled by default via Spring Security, with only justified, narrow exemptions (test-login, OAuth2 code callback, validations); the client correctly fetches and forwards `X-CSRF-TOKEN`.
- **TLS:** No certificate-trust-all or hostname-verification bypass found anywhere in the server.
- **Client-side token storage:** No auth tokens or credentials found in `localStorage`/`sessionStorage`; auth relies on server-side session cookies, and only non-sensitive UI state (selected org, post-login redirect path) is persisted client-side.
- **Client-side XSS:** All other `dangerouslySetInnerHTML` usages (including the `jsondiffpatch` HTML diff in change-request review) are wrapped in `DOMPurify.sanitize(...)`.
- **CORS:** No `@CrossOrigin`/`CorsConfigurationSource` found — default same-origin policy applies.
- **Authorization scaffolding in general:** Every mutating endpoint checked across the ~24 REST controllers calls one of `confirmSuperUser` / `confirmOrganizationMembership` / `confirmApplicationWriteAccess` / `confirmApplicationDeleteAccess` / `confirmInstitutionAdmin` / `confirmPolicyAccess`, consistently scoping checks to the resource's *actual* `Organization`/`Application` fetched from the database — the specific breaks are the ones itemized above (findings #2, #3, #6), not a systemic absence of checks.

---

## Round 2 — post-remediation re-audit (2026-08-29)

**Method:** Three more independent LLM audit passes, this time against the already-remediated code — one scrutinizing the `git diff` itself for incomplete/regressed fixes, one specifically hunting for sibling code paths sharing a pattern with something that *was* fixed but were themselves left untouched, and one doing a ground-up sweep of areas the first round covered less deeply (`access/repository/**`, every `@Entity`, `access/invite`, `access/remote`, `access/cron`, `access/lifecycle`, and client-side pages/stores). All three confirmed the 20 Round 1 fixes are correct and complete with no regressions. Two of three passes independently found the same Critical/High gap (#21). All newly-found issues below were fixed and covered by new regression tests; `mvn clean install` passes (336 tests). The app was also manually clicked through end-to-end in the browser (dev profile, clean seeded data) — see the verification note at the end of this section.

| # | Finding | Severity | Remediation |
|---|---|---|---|
| 21 | GUEST-tier application members retain full write/delete/secret-reset access to Connections — fix #7 only covered the read path | **Critical** | **Fixed** — raised to `MEMBER` in `ConnectionController.create` and the shared `findConnectionForAuthorizedUser` helper (used by update, reset-secret, delete, change-requests); regression test added |
| 22 | Cross-organization IDOR in `ApplicationMembershipController.create` — `organizationMembershipId` never checked against the target application's organization | **High** | **Fixed** — added explicit organization-match check; regression test added |
| 23 | `ApplicationMembershipController.delete` used an org-wide authorization check instead of the app-scoped check `create` actually uses, despite a comment claiming parity | **Medium** | **Fixed** — now uses `confirmApplicationWriteAccess` on the specific application, matching `create` |
| 24 | `ApplicationController.update` still defaulted to `GUEST` (the single-arg `confirmApplicationWriteAccess` overload), letting the lowest tier edit application metadata | **Medium** | **Fixed** — raised to `MEMBER` |
| 25 | `ContractController.update` persisted the raw client-supplied entity — an institution admin (not just a super-user) could silently un-sign a contract or rewrite its Jira `ticketKey` | **Medium** | **Fixed** — added `Contract.merge()` (safe-field allowlist, mirroring `Application`/`Connection`); `signedContract` can now only move false→true, only via the existing super-user path; regression test added |
| 26 | `PublicController.serviceProviders()` (the list endpoint) had no independent secret redaction, unsafe under `manage.enabled=false` (the shipped default), since `LocalManage.serviceProvidersLight()` returns unfiltered records | **Low** | **Fixed** — same `removeSecretsFromProvider` pattern applied per-item |
| 27 | Logo decompression-bomb cap (`MAX_LOGO_PIXELS`) was 50 megapixels (~190MB decoded raster) — far more generous than the 200×200 output target the fix itself cites | **Low** | **Fixed** — tightened to 12 megapixels (~48MB), still generous headroom for a high-res source photo |

Also applied for defensive consistency (no confirmed live exploit): `UserController.me` now runs the caller's own organization's SAML IdP metadata through the same `removeSecretsFromProvider` redaction used everywhere else, even though no secret-shaped field exists in the current SAML IdP schema.

**Live verification:** ran the app end-to-end in the browser against the `dev` profile with freshly-seeded demo data (`POST /api/v1/system/seed/demo`) — full navigation sweep (all sidebar sections), invitation create → email render (confirmed `{{message}}` escaping fix live: `<b>friend</b>` renders as literal text, line breaks preserved via CSS) → accept flow, and application creation, all clean with zero unexpected console/network errors. One real client-side gap was found and fixed in the process: `Invitation.jsx`'s accept flow had no `.catch()`, so the now-possible 403 from fix #5 (mismatched invitee email) left the page on an infinite loading spinner with no explanation. Fixed with a proper error flash message (`invitation.acceptedErrorFlash`, both locales) and `showErrorDialog=false` on that specific call so the dedicated message shows instead of a generic dialog.

(Two console-noise items were investigated and are **not application bugs**: (1) `/api/v1/stats/loginTimeFrame` 400s in the dev environment are `ResourceAccessException: Connection refused` to `localhost:8081` — no local mock statistics backend is running outside the test suite's WireMock stub, an environment limitation, not a regression; (2) an application detail page briefly appeared stuck on a permanent loading spinner with a `Provider not found` 404 — traced to the local dev MariaDB database being shared with, and repeatedly contaminated by, this session's own `mvn clean install` test runs (`AbstractTest`'s seed data includes a connection with a deliberately-unresolvable placeholder `manageIdentifier`, used only for a WireMock-stubbed test scenario). Not a code defect; resolved for verification purposes by truncating the local dev database and re-seeding via the app's own `/api/v1/system/seed/demo` endpoint.)
