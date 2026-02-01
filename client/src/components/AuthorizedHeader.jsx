import React from "react";
import "./AuthorizedHeader.scss";
import {BreadCrumb} from "./BreadCrumb.jsx";
import {UserMenu} from "./UserMenu.jsx";
import {useLocation} from "react-router-dom";
import {Button, ButtonType} from "@surfnet/sds";
import {useLogout} from "../hooks/UseLogout.jsx";
import I18n from "../locale/I18n.js";

export const AuthorizedHeader = ({setIsAuthenticated}) => {

    const currentLocation = useLocation();
    const logoutUser = useLogout();

    if (currentLocation.pathname === "/landing") {
        return (
            <div className="guest-authorized-header">
                <Button onClick={() => logoutUser(null, setIsAuthenticated)}
                        txt={I18n.t("landing.header.logout")}
                        type={ButtonType.Secondary}
                />
            </div>)
    }

    return (
        <div className="authorized-header">
            <BreadCrumb/>
            <UserMenu setIsAuthenticated={setIsAuthenticated}/>
        </div>
    );
}