import "./IdentityProvider.scss";
import React from "react";
import I18n from "../locale/I18n";

const IdentityProvider = ({organization, user}) => {
    return (
        <div
            className="identity-provider-outer-container">
            <div className="identity-provider-header-container">
                <div className="top-header">
                    <h1>{I18n.t("identityProvider.title")}</h1>
                </div>
                <p>{I18n.t("identityProvider.info", {name: organization.name})}</p>
            </div>
            <div className="identity-provider">
                {user.name}
            </div>
        </div>

    )
};
export default IdentityProvider;