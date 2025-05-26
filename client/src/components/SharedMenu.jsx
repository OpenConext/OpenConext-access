import I18n from "../locale/I18n";
import "./SharedMenu.scss"
import {useNavigate} from "react-router";
import {Loader, NavigationMenu} from "@surfnet/sds";
import HomeIcon from "@surfnet/sds/icons/illustrative-icons/home.svg";
import LaptopIcon from "@surfnet/sds/icons/illustrative-icons/laptop.svg";
import ScreenIcon from "@surfnet/sds/icons/illustrative-icons/screen.svg";

import {useAppStore} from "../stores/AppStore.js";
import {useEffect, useState} from "react";
import {isEmpty} from "../utils/Utils.js";
import {SharedMenuFooter} from "./SharedMenuFooter.jsx";

const allMenuItems = [
    {
        name: "home",
        path: "/home",
        relative: true,
        Logo: HomeIcon
    },
    {
        name: "applications",
        path: "dashboard",
        relative: false,
        postPath: "login",
        Logo: ScreenIcon
    },
    {
        name: "teams",
        path: "invite",
        relative: false,
        postPath: "home",
        Logo: LaptopIcon
    }

]

export const SharedMenu = () => {

    const {menuItems, config, organization} = useAppStore(state => state);
    const [filteredMenuItems, setFilteredMenuItems] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const items = allMenuItems
            .filter(menuItem => menuItems.includes(menuItem.name))
            .map(menuItem => ({
                Logo: menuItem.Logo,
                label: I18n.t(`navigation.${menuItem.name}`),
                href: menuItem.relative ? menuItem.path : `https://${menuItem.path}.${config.baseUrl}/${menuItem.postPath}`
            }));
        setFilteredMenuItems(items);
    }, [menuItems]);


    const doNavigate = href => {
        if (href.startsWith("http")) {
            window.location.href = href;
        } else {
            navigate(href);
        }
    }

    if (isEmpty(filteredMenuItems)) {
        return <Loader/>
    }

    return (
        <NavigationMenu
            items={filteredMenuItems}
            logoLabel={"Access"}
            navigate={doNavigate}
            title={organization?.name || ""}
            settingToolTip={I18n.t("organizations.tooltip")}
            children={<SharedMenuFooter/>}
        />
    );
}
