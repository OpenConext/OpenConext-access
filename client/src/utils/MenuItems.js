import {isEmpty} from "./Utils.js";
import LaptopIcon from "@surfnet/sds/icons/illustrative-icons/laptop.svg";
import HierarchyIcon from "@surfnet/sds/icons/illustrative-icons/hierarchy.svg";
import LaptopFloatIcon from "@surfnet/sds/icons/illustrative-icons/laptop-1.svg";
import UserIcon from "@surfnet/sds/icons/functional-icons/id-2.svg";
import PolicyIcon from "@surfnet/sds/icons/functional-icons/lock.svg";
import ScreenIcon from "@surfnet/sds/icons/illustrative-icons/screen.svg";
import HomeIcon from "@surfnet/sds/icons/illustrative-icons/home.svg";
import ConnectedIcon from "@surfnet/sds/icons/illustrative-icons/connected.svg";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";
import HeadPhonesIcon from "@surfnet/sds/icons/illustrative-icons/headphones.svg";
import FeedbackIcon from "@surfnet/sds/icons/illustrative-icons/feedback.svg";
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
    feedback: "feedback"
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
    //If there is at least one organizationMembership, then we show yourApps
    newMenuItems.push(mainMenuItems.yourApps);
    const onlyGuest = user.organizationMemberships.every(m => m.authority === authorities.GUEST &&
        m.organization.id === currentOrganization.id);
    if (user.externalUser) {
        newMenuItems.push(mainMenuItems.idp);
    }
    if (onlyGuest) {
        return newMenuItems;
    }
    const isMember = user.organizationMemberships
        .some(m => authorities.MEMBER === m.authority &&
            m.organization.id === currentOrganization.id);
    const isAdmin = user.organizationMemberships
        .some(m => authorities.ADMIN === m.authority &&
            m.organization.id === currentOrganization.id);

    if (isMember || isAdmin) {
        newMenuItems.push(mainMenuItems.users);
    }
    if (!isEmpty(currentOrganization.manageIdentifier)) {
        newMenuItems.push(mainMenuItems.accessibleApps, mainMenuItems.idp, mainMenuItems.invite, mainMenuItems.sram);
    }
    if ((isAdmin || user.superUser) && !isEmpty(currentOrganization.manageIdentifier)) {
        newMenuItems.push(mainMenuItems.policies);
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
        label: "apps",
        items: [
            {
                name: mainMenuItems.accessibleApps,
                path: "/accessible-apps",
                Logo: ConnectedIcon
            },
            {
                name: mainMenuItems.yourApps,
                path: "/organization/organizationId",
                Logo: ScreenIcon
            },
            {
                name: mainMenuItems.catalogue,
                path: "/catalogue",
                Logo: LaptopIcon
            }]
    },
    {
        label: "externalMaintenance",
        items: [
            {
                name: mainMenuItems.invite,
                path: "/external/invite",
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
        label: "organizationMaintenance",
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
                name: mainMenuItems.policies,
                path: "/policies/overview",
                Logo: PolicyIcon
            },
        ]
    },
    {
        label: "support",
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
    const secondSlash = path.indexOf('/', 1);
    const strippedPath = secondSlash === -1 ? path : path.substring(0, secondSlash);
    const activeItem = allMenuGroups
        .map(group => group.items)
        .flat()
        .find(item => item.path.startsWith(strippedPath));
    return activeItem?.name || mainMenuItems.home;
}

