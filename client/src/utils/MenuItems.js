import {isEmpty} from "./Utils.js";

export const mainMenuItems = {
    home: "home",
    users: "users",
    idp: "idp",
    yourApps: "yourApps",
    catalogue: "catalogue",
    accessibleApps: "accessibleApps",
    roles: "roles",
    collaborations: "collaborations",
    serviceDesk: "servicedesk",
    feedback: "feedback"
}

export const menuItemsForUser = user => {
    const hasOrganizationMemberships = !isEmpty(user.organizationMemberships);
    const newMenuItems = [mainMenuItems.home, mainMenuItems.catalogue]
    if (hasOrganizationMemberships) {
        newMenuItems.push(mainMenuItems.yourApps, mainMenuItems.users, mainMenuItems.idp);
    }
    if (!user.externalUser) {
        newMenuItems.push(mainMenuItems.accessibleApps, mainMenuItems.roles, mainMenuItems.collaborations);
    }
    //Every user has access to the help menu items
    newMenuItems.push(mainMenuItems.serviceDesk, mainMenuItems.feedback);
    return newMenuItems;
}