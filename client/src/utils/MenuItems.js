import {useAppStore} from "../stores/AppStore.js";
import {isEmpty} from "./Utils.js";

export const mainMenuItems = {
    home: "home",
    users: "users",
    idp: "idp",
    yourApps: "yourApps",
    catalogue: "catalogue",
    accessibleApps: "accessibleApps",
    roles: "roles",
    collaborations: "collaborations"
}

export const menuItemsForUser = (user, config) => {
    const hasOrganizationMemberships = !isEmpty(user.organizationMemberships);
    const externalUser = user.schacHomeOrganization === config.eduIdSchacHomeOrganization;
    const newMenuItems = [mainMenuItems.home, mainMenuItems.yourApps, mainMenuItems.catalogue]
    if (hasOrganizationMemberships) {
        newMenuItems.push(mainMenuItems.users);
    }
    if (!externalUser) {
        newMenuItems.push(mainMenuItems.accessibleApps, mainMenuItems.idp, mainMenuItems.roles, mainMenuItems.collaborations);
    }
    return newMenuItems;
}