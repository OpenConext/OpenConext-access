import I18n from "../locale/I18n";
import "./SharedMenu.scss"
import {useLocation, useNavigate} from "react-router";
import {NavigationMenu} from "@surfnet/sds";
import LaptopIcon from "@surfnet/sds/icons/illustrative-icons/laptop.svg";
import ScreenIcon from "@surfnet/sds/icons/illustrative-icons/screen.svg";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";

import {useAppStore} from "../stores/AppStore.js";
import {useEffect, useState} from "react";
import {SharedMenuFooter} from "./SharedMenuFooter.jsx";

const allMenuGroups = [{
    label: "organizationMaintenance",
    items: [{
        name: "users",
        path: "/users/organizationId",
        relative: true,
        Logo: TeamIcon
    }]
},
    {
        label: "catalogue",
        items: [{
            name: "yourApps",
            path: "/organization/organizationId",
            relative: true,
            Logo: ScreenIcon
        },
            {
                name: "allApps",
                path: "dashboard",
                relative: false,
                postPath: "",
                Logo: LaptopIcon
            }]
    }
]

export const SharedMenu = () => {

    const {menuItems, config, currentOrganization, activeMenuItem} = useAppStore(state => state);

    const [filteredMenuGroups, setFilteredMenuGroups] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const newMenuGroups = allMenuGroups
            .map(menuGroup => ({
                label: I18n.t(`navigation.${menuGroup.label}`),
                items: menuGroup.items
                    .filter(menuItem => menuItems.includes(menuItem.name))
                    .map(menuItem => ({
                        Logo: menuItem.Logo,
                        label: I18n.t(`navigation.${menuItem.name}`),
                        name: menuItem.name,
                        active: menuItem.name === activeMenuItem,
                        href: menuItem.relative ? menuItem.path.replace("organizationId", currentOrganization.id) :
                            `https://${menuItem.path}.${config.baseUrl}/${menuItem.postPath}`
                    }))
            }))
            .filter(menuGroup => menuGroup.items.length > 0);
        setFilteredMenuGroups(newMenuGroups);
    }, [activeMenuItem, menuItems, currentOrganization]);


    const setActiveMenuItem = menuItem => {
        const href = menuItem.href;
        if (href.startsWith("http")) {
            window.location.href = href;
        } else {
            navigate(href);
        }
        useAppStore.setState(() => ({
            activeMenuItem: menuItem.name
        }));
    }

    return (
        <NavigationMenu
            groups={filteredMenuGroups}
            logoLabel={"Access"}
            setActiveMenuItem={setActiveMenuItem}
            title={currentOrganization?.name || ""}
            settingToolTip={I18n.t("organizations.tooltip")}
            children={<SharedMenuFooter/>}
        />
    );
}
