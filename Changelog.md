# Release notes

## 0.2.1

### Features
- Contractual agreement moved from application level to organization level ([#724](https://github.com/OpenConext/OpenConext-access/issues/724)).
- Promote memberships of existing users when they are upgraded to Institution Admin ([#799](https://github.com/OpenConext/OpenConext-access/issues/799)).
- Automatically add new RPs/SPs to the `allowed` list of test IdPs on connection creation ([#814](https://github.com/OpenConext/OpenConext-access/issues/814)).

### Improvements
- Show a proper error modal instead of a blank screen when the user's IdP cannot be found or required attributes are missing ([#819](https://github.com/OpenConext/OpenConext-access/issues/819), [#820](https://github.com/OpenConext/OpenConext-access/issues/820)).
- Impersonation no longer adds memberships to the impersonated user.
- Defensive handling of the `enabled-apps` endpoint to prevent 404 errors.
- Updated backend and frontend dependencies (Maven, npm, GitHub Actions).

### Bug Fixes
- Removed the non-functional 'Approve all' button for external organization members and guests ([#779](https://github.com/OpenConext/OpenConext-access/issues/779)).
- Fixed empty Contract screen when creating a new application as eduID admin ([#824](https://github.com/OpenConext/OpenConext-access/issues/824)).
- Fixed `LazyInitializationException` when loading organization memberships in the `/me` endpoint ([#822](https://github.com/OpenConext/OpenConext-access/issues/822)).

## 0.2.0

### Features
- Feature toggle for test environment ([#790](https://github.com/OpenConext/OpenConext-access/issues/790))

### Improvements
- Use the SURF-CRM-ID for looking up the IdP of the user ([#796](https://github.com/OpenConext/OpenConext-access/issues/796))

## 0.1.1

### Features
- Added support for multiple external and owner schacHomeOrganizations in server configuration ([#756](https://github.com/OpenConext/OpenConext-access/issues/756), [#752](https://github.com/OpenConext/OpenConext-access/issues/752)).
- Added 'Other' contact person type for applications.
- Added telephone column to the Contracts overview ([#724](https://github.com/OpenConext/OpenConext-access/issues/724)).

### Improvements
- Added required field indicators for Protocol and Redirect URLs in Connection settings ([#641](https://github.com/OpenConext/OpenConext-access/issues/641)).
- Improved the 'Approve' header in the Join Request management dialog.
- Enhanced styling and responsiveness for Contracts and Monitoring pages.
- Updated translations for Dutch and English.
- Automated dependency updates for backend and frontend libraries.

### Bug Fixes
- Added validation to prevent the technical contact from being identical to the administrative contact ([#760](https://github.com/OpenConext/OpenConext-access/issues/760)).
- Fixed a bug where external user schacHomeOrganizations were not correctly normalized when creating organizations ([#767](https://github.com/OpenConext/OpenConext-access/issues/767)).
- Corrected CSS variable definitions in global styles ([#772](https://github.com/OpenConext/OpenConext-access/issues/772)).
- Fixed layout issues and accessibility in the User Feedback widget ([#761](https://github.com/OpenConext/OpenConext-access/issues/761)).


## 0.1.0
Initial release with basic functionality and styling.
