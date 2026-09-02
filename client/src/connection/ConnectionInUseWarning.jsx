import React from "react";
import {isEmpty} from "../utils/Utils.js";
import I18n from "../locale/I18n";
import {providerName} from "../utils/Manage.js";
import DOMPurify from "dompurify";

export const units = {
    organization: "organization",
    application: "application",
    connection: "connection"
}

export const ConnectionInUseWarning = ({identityProviders, applicationName, unit}) => {

    if (isEmpty(identityProviders)) {
        return null;
    }

    return (
        <div className="connection-in-use-warning">
            <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`connection.${unit === units.organization ? "inUseWarningOrg": "inUseWarning"}`,
                    {name: applicationName}))}}/>
            <ul>
                {identityProviders.map((idp, index) =>
                <li key={index}>{providerName(I18n.locale, idp)}</li>)}
            </ul>
            <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.inUseTip",
                    {unit: I18n.t(`connection.units.${unit}`)}))}}/>
        </div>

)
}
