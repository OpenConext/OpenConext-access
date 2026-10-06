import {isEmpty} from "./Utils.js";
import {
    AppWindowIcon as ScreenIcon,
    SquaresFourIcon as LaptopIcon,
    LinkIcon as ConnectedIcon,
    LockIcon as PolicyIcon,
    UserCircleCheckIcon as TeamIcon,
    FediverseLogoIcon as HierarchyIcon,
    BuildingIcon as LaptopFloatIcon,
    UserRectangleIcon as UserIcon,
    ChartLineIcon as StatsIcon,
    HouseIcon as HomeIcon,
    LifebuoyIcon as HeadPhonesIcon,
    ChatCenteredTextIcon as FeedbackIcon
} from "@phosphor-icons/react";
import {authorities} from "./Permissions.js";
import {useAppStore} from "../stores/AppStore.js";

export const mainMenuItems = {
    home: "home",
    users: "users",
    idp: "idp",
    yourApps: "yourApps",
    catalogue: "catalogue",
    policies: "policies",
    accessibleApps: "accessibleApps",
    invite: "invite",
    sram: "sram",
    serviceDesk: "serviceDesk",
    feedback: "feedback",
    statistics: "statistics"
}

const doMenuItemsForUser = (user, currentOrganization, feedbackWidgetEnabled = useAppStore.getState().config.feedbackWidgetEnabled) => {
    //Every user has access to the home, catalogue and help menu items
    const newMenuItems = [mainMenuItems.home, mainMenuItems.catalogue, mainMenuItems.serviceDesk];
    if (!feedbackWidgetEnabled) {
        newMenuItems.push(mainMenuItems.feedback);
    }
    const noOrganizationMemberships = isEmpty(user.organizationMemberships);
    if (noOrganizationMemberships) {
        return newMenuItems;
    }
    //Only the memberships of the current organization matter, the user can have other authorities elsewhere
    const currentMemberships = user.organizationMemberships.filter(m => m.organization.id === currentOrganization.id);
    const onlyGuest = !isEmpty(currentMemberships) && currentMemberships.every(m => m.authority === authorities.GUEST);
    if (onlyGuest) {
        newMenuItems.push(mainMenuItems.yourApps);
        return newMenuItems;
    }
    //If there is at least one organizationMembership, then we show yourApps
    const isMember = user.organizationMemberships
        .some(m => authorities.MEMBER === m.authority &&
            m.organization.id === currentOrganization.id);
    const isAdmin = user.organizationMemberships
        .some(m => authorities.ADMIN === m.authority &&
            m.organization.id === currentOrganization.id);

    if (isMember || isAdmin) {
        newMenuItems.push(mainMenuItems.idp, mainMenuItems.users, mainMenuItems.yourApps);
    }
    const isInstitution = !isEmpty(currentOrganization.manageIdentifier);
    if (isInstitution) {
        newMenuItems.push(mainMenuItems.accessibleApps, mainMenuItems.invite, mainMenuItems.sram);
    }
    if ((isAdmin || user.superUser) && isInstitution) {
        newMenuItems.push(mainMenuItems.statistics, mainMenuItems.policies);
    }
    return newMenuItems;
}

export const menuItemsForUser = (user, organization = useAppStore.getState().currentOrganization) => {
    const allMenuItems = doMenuItemsForUser(user, organization);
    const disabledFeatures = useAppStore.getState().config.features
        .filter(feature => feature.enabled === false)
        .map(feature => feature.name);
    return allMenuItems
        .filter(menuItem => !disabledFeatures.includes(menuItem));
}

export const allMenuGroups = [
    {
        label: null,
        items: [
            {
                name: mainMenuItems.home,
                path: "/home",
                Logo: HomeIcon
            }
        ]
    },
    {
        label: "applications",
        items: [
            {
                name: mainMenuItems.yourApps,
                path: "/organization/organizationId",
                Logo: ScreenIcon
            },
            {
                name: mainMenuItems.catalogue,
                path: "/catalogue",
                Logo: LaptopIcon
            },
            {
                name: mainMenuItems.accessibleApps,
                path: "/accessible-apps",
                Logo: ConnectedIcon
            }
        ]
    },
    {
        label: "externalMaintenance",
        items: [
            {
                name: mainMenuItems.policies,
                path: "/policies/overview",
                Logo: PolicyIcon
            },
            {
                name: mainMenuItems.invite,
                path: "/external/invite",
                // Roles are managed in the Invite application, see SharedMenu
                externalConfigKey: "invite",
                externalSameTabConfigKey: "inviteSameTab",
                externalPath: "/home/roles",
                Logo: TeamIcon
            },
            {
                name: mainMenuItems.sram,
                path: "/external/sram",
                Logo: HierarchyIcon
            }
        ]
    },
    {
        label: "organisation",
        items: [
            {
                name: mainMenuItems.idp,
                path: "/idp/organizationId",
                Logo: LaptopFloatIcon
            },
            {
                name: mainMenuItems.users,
                path: "/users/organizationId",
                Logo: UserIcon
            },
            {
                name: mainMenuItems.statistics,
                path: "/statistics",
                Logo: StatsIcon
            },
        ]
    },
    {
        label: null,
        className: "custom-group",
        items: [
            {
                name: mainMenuItems.serviceDesk,
                path: "/external/serviceDesk",
                Logo: HeadPhonesIcon
            },
            {
                name: mainMenuItems.feedback,
                path: "/feedback",
                Logo: FeedbackIcon
            },
        ]
    },
]

export const activeMenuItem = currentLocation => {
    const path = currentLocation.pathname;
    const items = allMenuGroups.map(group => group.items).flat();

    // Prefer an exact match first, e.g. "/external/sram" vs "/external/serviceDesk" -
    // both share the "/external" prefix, so only a full-path match tells them apart.
    const exactMatch = items.find(item => item.path === path);
    if (exactMatch) {
        return exactMatch.name;
    }

    // Fall back to a prefix match on the first two path segments for routes with a
    // dynamic id, e.g. "/organization/:id" matching item.path "/organization/organizationId".
    const secondSlash = path.indexOf('/', 1);
    const strippedPath = secondSlash === -1 ? path : path.substring(0, secondSlash);
    const activeItem = items.find(item => item.path.startsWith(strippedPath));
    return activeItem?.name || mainMenuItems.home;
}

