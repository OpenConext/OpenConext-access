import React from "react";
import "./AuthorizedHeader.scss";
import {BreadCrumb} from "./BreadCrumb.jsx";
import {UserMenu} from "./UserMenu.jsx";
import {LanguageSwitcher} from "./LanguageSwitcher.jsx";
import {useLocation} from "react-router";
import {Button, SidebarTrigger} from "@surfnet/curve-react";
import {useLogout} from "../hooks/UseLogout.jsx";
import I18n from "../locale/I18n.js";
import {sanitize} from "../utils/Utils";

export const AuthorizedHeader = ({setIsAuthenticated}) => {

    const currentLocation = useLocation();
    const logoutUser = useLogout();

    if (currentLocation.pathname === "/landing") {
        return (
            <div className="guest-authorized-header">
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
                <UserMenu setIsAuthenticated={setIsAuthenticated}/>
            </div>
        </div>
    );
}
