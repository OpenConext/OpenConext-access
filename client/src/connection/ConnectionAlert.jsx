import React from "react";
import I18n from "../locale/I18n";
import {Alert, AlertAction, AlertDescription, Button} from "@surfnet/curve-react";
import {InfoIcon, WarningIcon, XIcon} from "@phosphor-icons/react";
import {isEmpty, sanitize, splitListSemantically} from "../utils/Utils.js";
import {CONNECTION_STATUSES} from "../utils/Manage.js";
import "./ConnectionAlert.scss";

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

    const renderAlert = ({warning = false, message, close, action, actionLabel}) => (
        <Alert className="connection-alert" variant={warning ? "warning" : "info"}>
            {warning ? <WarningIcon/> : <InfoIcon/>}
            <AlertDescription className="alert-description-with-action">
                <span dangerouslySetInnerHTML={{__html: sanitize(message)}}/>
                {action && <AlertAction onClick={action}>
                    <Button size="sm" variant="outline">
                        {actionLabel}
                    </Button>
                </AlertAction>}
            </AlertDescription>
            {close && <AlertAction>
                <button type="button" onClick={close}><XIcon/></button>
            </AlertAction>}
        </Alert>
    );

    const alertInfo = () => {
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
