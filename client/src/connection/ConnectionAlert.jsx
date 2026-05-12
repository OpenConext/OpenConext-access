import "./ConnectionAlert.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Alert, AlertType} from "@surfnet/sds";
import {isEmpty, splitListSemantically} from "../utils/Utils.js";
import {CONNECTION_STATUSES} from "../utils/Manage.js";


export const ConnectionAlert = ({
                                    user, application, setTab,
                                    connectionComplete,
                                    appInformationComplete,
                                    connectionNeedsApproval,
                                    customProdTabAction = null,
                                    fullWidth = false
                                }) => {

    const [alertClosed, setAlertClosed] = useState(false);

    const alertInfo = () => {
        if (alertClosed) {
            return null;
        }
        let connectionsNeedActivationNames = [];
        if (application.signedContract && !isEmpty(application.connections)) {
            const names = application.connections
                .filter(conn =>
                    conn.status === CONNECTION_STATUSES.COMPLETE || conn.status === CONNECTION_STATUSES.IN_PROGRESS)
                .map(conn => conn.name);
            connectionsNeedActivationNames = splitListSemantically(names, I18n.t("forms.and"));
        }
        if (isEmpty(application.connections)) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Info}
                       asChild={true}
                       message={I18n.t("connection.welcome", {user: user.name, name: application.name})}/>
            )
        }
        if (connectionComplete) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Info}
                       asChild={true}
                       message={I18n.t("connection.productionConnectionHint")}/>
            )
        }
        if (connectionNeedsApproval && !appInformationComplete) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Warning}
                       asChild={true}
                       message={I18n.t("connection.applicationInformationHint")}/>
            )
        }
        if (connectionComplete && connectionNeedsApproval)
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Warning}
                       asChild={true}
                       message={I18n.t("connection.productionActivationHint", {name: connectionsNeedActivationNames})}
                       action={() => customProdTabAction ? customProdTabAction() : setTab("prod", "activate")}
                       actionLabel={I18n.t("connection.productionActivationAction")}/>
            )
    }

    return (
        <div className={`alert-container ${fullWidth ? "full-width" : ""}`}>
            {alertInfo()}
        </div>
    )
}
