import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Alert, AlertAction, AlertDescription} from "@surfnet/curve-react";
import {InfoIcon, WarningIcon, XIcon} from "@phosphor-icons/react";
import {isEmpty, sanitize, splitListSemantically} from "../utils/Utils.js";
import {CONNECTION_STATUSES} from "../utils/Manage.js";


export const ConnectionAlert = ({
                                    user,
                                    application,
                                    setTab,
                                    connectionComplete,
                                    appInformationComplete,
                                    connectionNeedsApproval,
                                    currentOrganization,
                                    customProdTabAction = null,
                                    fullWidth = false
                                }) => {

    const [alertClosed, setAlertClosed] = useState(false);

    const renderAlert = ({warning = false, message, close, action, actionLabel}) => (
        <Alert>
            {warning ? <WarningIcon/> : <InfoIcon/>}
            <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(message)}}/>
            {action && <button type="button" className="alert-action" onClick={action}>{actionLabel}</button>}
            {close && <AlertAction>
                <button type="button" onClick={close}><XIcon/></button>
            </AlertAction>}
        </Alert>
    );

    const alertInfo = () => {
        if (alertClosed) {
            return null;
        }
        let connectionsNeedActivationNames = [];
        if ((!isEmpty(currentOrganization.manageIdentifier)) && !isEmpty(application.connections)) {
            const names = application.connections
                .filter(conn =>
                    conn.status === CONNECTION_STATUSES.COMPLETE)
                .map(conn => conn.name);
            connectionsNeedActivationNames = splitListSemantically(names, I18n.t("forms.and"));
        }
        if (isEmpty(application.connections)) {
            return renderAlert({
                message: I18n.t("connection.welcome", {user: user.name, name: application.name})
            });
        }
        if (connectionNeedsApproval && !appInformationComplete) {
            return renderAlert({
                warning: true,
                message: I18n.t(`connection.applicationInformationHint${currentOrganization.manageIdentifier ? "" : "Vendor"}`)
            });
        }
        if (connectionComplete && connectionNeedsApproval)
            return renderAlert({
                warning: true,
                close: () => setAlertClosed(true),
                message: I18n.t("connection.productionActivationHint", {name: connectionsNeedActivationNames}),
                action: () => customProdTabAction ? customProdTabAction() : setTab("allConnections", "activate"),
                actionLabel: I18n.t("connection.productionActivationAction")
            });
    }

    return (
        <div className={`alert-container ${fullWidth ? "full-width" : ""}`}>
            {alertInfo()}
        </div>
    )
}
