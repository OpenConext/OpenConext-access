import I18n from "../locale/I18n";
import "./SharedMenu.scss"
import {useNavigate} from "react-router";
import {NavigationMenu} from "@surfnet/sds";
import CheckIcon from "@surfnet/sds/icons/check.svg";

import {useAppStore} from "../stores/AppStore.js";
import {useMemo} from "react";
import {SharedMenuFooter} from "./SharedMenuFooter.jsx";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import {allMenuGroups} from "../utils/MenuItems.js";
import {isEmpty} from "../utils/Utils.js";
import {useShallow} from "zustand/react/shallow";
import {useLocation} from "react-router-dom";

export const SharedMenu = () => {

    const {menuItems, currentOrganization, activeMenuItem} = useAppStore(useShallow(state => ({
        menuItems: state.menuItems,
        currentOrganization: state.currentOrganization,
        activeMenuItem: state.activeMenuItem
    })));

    const navigate = useNavigate();
    const currentLocation = useLocation();
        console.log(currentLocation.href)
    const filteredMenuGroups = useMemo(() => {
        return allMenuGroups
            .map(menuGroup => ({
                label: menuGroup.label ? I18n.t(`navigation.${menuGroup.label}`) : null,
                className: menuGroup.className,
                items: menuGroup.items
                    .filter(menuItem => menuItems.includes(menuItem.name))
                    .map(menuItem => ({
                        Logo: menuItem.Logo,
                        label: I18n.t(`navigation.${menuItem.name}`),
                        name: menuItem.name,
                        tooltip: isEmpty(I18n.translations[I18n.locale].navigation.tooltips[menuItem.name]) ? null :
                            I18n.t(`navigation.tooltips.${menuItem.name}`),
                        active: menuItem.name === activeMenuItem,
                        href: menuItem.path.replace("organizationId", currentOrganization.id)
                    }))
            }))
            .filter(menuGroup => menuGroup.items.length > 0);
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
