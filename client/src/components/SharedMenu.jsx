import I18n from "../locale/I18n";
import "./SharedMenu.scss"
import {useNavigate} from "react-router";
import {NavigationMenu} from "@surfnet/sds";
import LaptopIcon from "@surfnet/sds/icons/illustrative-icons/laptop.svg";
import HierarchyIcon from "@surfnet/sds/icons/illustrative-icons/hierarchy.svg";
import LaptopFloatIcon from "@surfnet/sds/icons/illustrative-icons/laptop-1.svg";
import UserIcon from "@surfnet/sds/icons/functional-icons/id-2.svg";
import CheckIcon from "@surfnet/sds/icons/check.svg";
import ScreenIcon from "@surfnet/sds/icons/illustrative-icons/screen.svg";
import HomeIcon from "@surfnet/sds/icons/illustrative-icons/home.svg";
import AlarmBell from "@surfnet/sds/icons/functional-icons/alarm-bell.svg";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";

import {useAppStore} from "../stores/AppStore.js";
import {useEffect, useState} from "react";
import {SharedMenuFooter} from "./SharedMenuFooter.jsx";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import {mainMenuItems} from "../utils/MenuItems.js";

const allMenuGroups = [
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
                Logo: AlarmBell
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
                name: mainMenuItems.roles,
                path: "/users/organizationId",
                Logo: TeamIcon
            },
            {
                name: mainMenuItems.collaborations,
                path: "/users/idp",
                Logo: HierarchyIcon
            }
        ]
    },
    {
        label: "organizationMaintenance",
        items: [
            {
                name: mainMenuItems.users,
                path: "/users/organizationId",
                Logo: UserIcon
            },
            {
                name: mainMenuItems.idp,
                path: "/users/idp",
                Logo: LaptopFloatIcon
            }
        ]
    },
]

export const SharedMenu = () => {

    const {menuItems, currentOrganization, activeMenuItem} = useAppStore(state => state);

    const [filteredMenuGroups, setFilteredMenuGroups] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const newMenuGroups = allMenuGroups
            .map(menuGroup => ({
                label: menuGroup.label ? I18n.t(`navigation.${menuGroup.label}`) : null,
                items: menuGroup.items
                    .filter(menuItem => menuItems.includes(menuItem.name))
                    .map(menuItem => ({
                        Logo: menuItem.Logo,
                        label: I18n.t(`navigation.${menuItem.name}`),
                        name: menuItem.name,
                        active: menuItem.name === activeMenuItem,
                        href: menuItem.path.replace("organizationId", currentOrganization.id)
                    }))
            }))
            .filter(menuGroup => menuGroup.items.length > 0);
        setFilteredMenuGroups(newMenuGroups);
    }, [activeMenuItem, menuItems, currentOrganization]);


    const setActiveMenuItem = menuItem => {
        const href = menuItem.href;
        navigate(href);
        useAppStore.setState(() => ({
            activeMenuItem: menuItem.name
        }));
    }

    const isPendingApproval = currentOrganization.status === ORGANIZATION_STATUSES.PENDING_APPROVAL;
    return (
        <NavigationMenu
            groups={filteredMenuGroups}
            logoLabel={"Access"}
            setActiveMenuItem={setActiveMenuItem}
            title={currentOrganization?.name || ""}
            settingToolTip={isPendingApproval ? I18n.t("organizations.tooltip") :
                I18n.t("organizations.tooltipApproved")}
            SettingLogo={isPendingApproval ? null : CheckIcon}
            children={<SharedMenuFooter/>}
        />
    );
}
