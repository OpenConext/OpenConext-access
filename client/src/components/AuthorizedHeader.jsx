import React from "react";
import "./AuthorizedHeader.scss";
import {BreadCrumb} from "./BreadCrumb.jsx";
import {UserMenu} from "./UserMenu.jsx";

export const AuthorizedHeader = ({setIsAuthenticated}) => {

    return (
        <div className="authorized-header">
            <BreadCrumb/>
            <UserMenu setIsAuthenticated={setIsAuthenticated}/>
        </div>
    );
}