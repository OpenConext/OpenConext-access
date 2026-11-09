import React from "react";
import "./AuthorizedHeader.scss";
import {BreadCrumb} from "./BreadCrumb.jsx";
import {LanguageSwitcher} from "./LanguageSwitcher.jsx";
import {Link, useLocation} from "react-router";
import {useAppStore} from "../stores/AppStore.js";
import {supportMenuItem} from "../utils/MenuItems.js";
import {Button} from "@surfnet/curve-react";
import {useLogout} from "../hooks/UseLogout.jsx";
import I18n from "../locale/I18n.js";
import {sanitize} from "../utils/Utils";

export const AuthorizedHeader = ({setIsAuthenticated}) => {

    const currentLocation = useLocation();
    const menuItems = useAppStore(state => state.menuItems);
    const logoutUser = useLogout();

    if (currentLocation.pathname === "/landing" || currentLocation.pathname.startsWith("/join")
        || currentLocation.pathname.startsWith("/relax")) {
        return (
            <div className="guest-authorized-header">
                <LanguageSwitcher/>
                <Button onClick={() => logoutUser(null, setIsAuthenticated)}
                        variant="secondary">
                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.header.logout"))}}/>
                </Button>
            </div>)
    }

    return (
        <div className="authorized-header">
            <BreadCrumb/>
            <div className="authorized-header-actions">
                <LanguageSwitcher/>
                {menuItems.includes(supportMenuItem.name) &&
                    <Link to={supportMenuItem.path} className="support-link">
                        {I18n.t(`navigation.${supportMenuItem.name}`)}
                    </Link>}
            </div>
        </div>
    );
}
