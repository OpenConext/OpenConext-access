import React from "react";
import I18n from "../locale/I18n";
import {Alert, AlertAction, AlertDescription, Button} from "@surfnet/curve-react";
import {InfoIcon, WarningCircleIcon, WarningIcon, XIcon} from "@phosphor-icons/react";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {useNavigate} from "react-router";
import "./ConnectionAlert.scss";

export const ConnectionAlert = ({
                                    application,
                                    appInformationComplete,
                                    connectionNeedsApproval,
                                    currentOrganization,
                                    fullWidth = false
                                }) => {
    const navigate = useNavigate();

    const renderAlert = ({warning = false, icon = null, title = null, message, close, action, actionLabel}) => (
        <Alert className="connection-alert" variant={warning ? "warning" : "info"}>
            {icon || (warning ? <WarningIcon/> : <InfoIcon/>)}
            <AlertDescription className="alert-description-with-action">
                <span className="alert-text">
                    {title && <strong className="alert-text-title">{title}</strong>}
                    <span dangerouslySetInnerHTML={{__html: sanitize(message)}}/>
                </span>
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
        if (isEmpty(application.connections)) {
            const isExternalOrganization = isEmpty(currentOrganization.manageIdentifier);
            if (isExternalOrganization && !currentOrganization.contractSigned) {
                return renderAlert({
                    icon: <WarningCircleIcon/>,
                    title: I18n.t("connection.contractRequiredHint.title"),
                    message: I18n.t("connection.contractRequiredHint.description"),
                    action: () => navigate(`/idp/${currentOrganization.id}/general`),
                    actionLabel: I18n.t("connection.contractRequiredHint.action")
                });
            }
            return null;
        }
        if (connectionNeedsApproval && !appInformationComplete) {
            return renderAlert({
                warning: true,
                message: I18n.t(`connection.applicationInformationHint${currentOrganization.manageIdentifier ? "" : "Vendor"}`)
            });
        }
    }

    return (
        <div className={`alert-container ${fullWidth ? "full-width" : ""}`}>
            {alertInfo()}
        </div>
    )
}
