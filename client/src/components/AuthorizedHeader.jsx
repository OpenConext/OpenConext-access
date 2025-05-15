import React from "react";
import "./AuthorizedHeader.scss";
import {BreadCrumb} from "./BreadCrumb.jsx";
import {UserMenu} from "./UserMenu.jsx";

export const AuthorizedHeader = () => {

    return (
        <div className="authorized-header">
            <BreadCrumb/>
            <UserMenu/>
        </div>
    );
}