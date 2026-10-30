# Access ⇄ Invite integration (context)

Invite (`/Users/harst001/projects/invite`, client `:3000`, server `:8888`) is shown inside the SURF Access shell: the same
left menu and organization switcher. The two apps may be deployed on **different domains**, so no cookies, sessions or
localStorage are shared.

## Menu
- Access owns the menu model: `MenuService` (`server/.../menu/`), single source of truth for item visibility per user and organization.
- Access client: `GET /api/v1/menu?organizationId=` (`MenuController`, session based).
- Invite server fetches it server-to-server: `GET /api/external/v1/menu?sub=&organizationId=` (basic auth, user `invite`
  in `application.yml`) via `AccessMenuClient`; Invite client calls its own `/api/v1/users/menu`.
- Unknown/missing `organizationId` falls back to the user's first membership (id or `manageIdentifier` accepted).
- Invite toggle `config.access-menu-enabled=false` hides the menu; if Access is down Invite falls back to an "invite"-only menu.
- Menu definitions are duplicated: `client/src/utils/MenuItems.js` (Access) and `client/src/utils/MenuItems.js` in Invite. Keep item names in sync with `MenuService`.

## Organization persistence (the URL carries it, each origin stores its own)
- Access → Invite: links add `?organizationId=<id>` (`inviteRolesHref` / `inviteRoleHref` in Access `MenuItems.js`, used by `SharedMenu.jsx` and `UserHomeMember.jsx`).
- Invite: `client/src/utils/Organization.js` reads param (else localStorage `organization`), `SharedMenu.jsx` stores the id Access resolved and strips the param.
- Invite → Access: org switcher links to `ACCESS/home?organizationId=<id>`; Access `App.jsx` `loadUserOrganization` stores it in localStorage `organization` and strips the param.
- Org switching only happens in Access-resolved ids; Invite's internal `<Link>`s rely on its localStorage.

## Config
- Access: `invite` (Invite url), `invite_same_tab` (true = open Invite in same tab, false = `/external/invite` page).
- Invite: `access.menu-uri/username/password`, `config.access-url` (base url for menu links back to Access).

## Verify
Run both apps; pick an org in Access → Roles → Invite shows it (and after reload); switch in Invite → Access follows.
Try Invite on `127.0.0.1:3000` to simulate separate origins.
