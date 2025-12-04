import {isEmpty} from "./Utils.js";
import LaptopIcon from "@surfnet/sds/icons/illustrative-icons/laptop.svg";
import HierarchyIcon from "@surfnet/sds/icons/illustrative-icons/hierarchy.svg";
import LaptopFloatIcon from "@surfnet/sds/icons/illustrative-icons/laptop-1.svg";
import UserIcon from "@surfnet/sds/icons/functional-icons/id-2.svg";
import ScreenIcon from "@surfnet/sds/icons/illustrative-icons/screen.svg";
import HomeIcon from "@surfnet/sds/icons/illustrative-icons/home.svg";
import ConnectedIcon from "@surfnet/sds/icons/illustrative-icons/connected.svg";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";
import HeadPhonesIcon from "@surfnet/sds/icons/illustrative-icons/headphones.svg";
import FeedbackIcon from "@surfnet/sds/icons/illustrative-icons/feedback.svg";

export const mainMenuItems = {
    home: "home",
    users: "users",
    idp: "idp",
    yourApps: "yourApps",
    catalogue: "catalogue",
    accessibleApps: "accessibleApps",
    invite: "invite",
    sram: "sram",
    serviceDesk: "serviceDesk",
    feedback: "feedback"
}

export const menuItemsForUser = user => {
    const hasOrganizationMemberships = !isEmpty(user.organizationMemberships);
    const newMenuItems = [mainMenuItems.home, mainMenuItems.catalogue];
    if (hasOrganizationMemberships) {
        newMenuItems.push(mainMenuItems.yourApps, mainMenuItems.users, mainMenuItems.idp);
    }
    if (!user.externalUser) {
        newMenuItems.push(mainMenuItems.accessibleApps, mainMenuItems.invite, mainMenuItems.sram);
    }
    //Every user has access to the help menu items
    newMenuItems.push(mainMenuItems.serviceDesk, mainMenuItems.feedback);
    return newMenuItems;
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
    let path = currentLocation.pathname;
    if (path === "/") {
        path = "/home"
    } else if (path.startsWith("/users/")) {
        path = path.substring(0, 7)
    } else if (path.startsWith("/organization/")) {
        path = path.substring(0, 13)
    }
    const activeItem = allMenuGroups
        .map(group => group.items)
        .flat()
        .find(item => item.path.startsWith(path));
    return activeItem?.name || mainMenuItems.home;
}

