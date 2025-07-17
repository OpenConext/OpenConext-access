import "./Overview.scss";
import React, {useMemo, useState} from "react";
import I18n from "../locale/I18n";
import {Alert, AlertType} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import {STATUS_LINK_TYPE, StatusLink} from "../components/StatusLink.jsx";
import {APPLICATION_STATUSES, CONNECTION_STATUSES, ENVIRONMENTS} from "../utils/Manage.js";
import {contactSectionValid, logoSectionValid, privacySectionValid} from "../utils/Application.js";


export const Overview = ({user, application, setTab, initConnection, privacyInfo, refreshApp}) => {

    const [alertClosed, setAlertClosed] = useState(false);

    const {
        testConnectionComplete,
        productionConnectionComplete,
        appInformationComplete,
        productionConnectionNeedsActivation,
    } = useMemo(() => {
        return {
            testConnectionComplete: !isEmpty(application.connections) &&
                application.connections
                    .filter(conn => conn.environment === ENVIRONMENTS.TEST)
                    .some(conn => conn.status !== CONNECTION_STATUSES.OPEN),
            productionConnectionComplete: !isEmpty(application.connections) &&
                application.connections
                    .filter(conn => conn.environment === ENVIRONMENTS.PROD)
                    .some(conn => conn.status !== CONNECTION_STATUSES.OPEN),
            appInformationComplete: logoSectionValid(application) && contactSectionValid(application) && privacySectionValid(privacyInfo, application)
                && application.status !== APPLICATION_STATUSES.OPEN,
            productionConnectionNeedsActivation: application.signedContract && !isEmpty(application.connections) &&
                application.connections
                    .filter(conn => conn.environment === ENVIRONMENTS.PROD)
                    .some(conn => conn.status === CONNECTION_STATUSES.COMPLETE)
        }
    }, [refreshApp]);

    const alertInfo = () => {
        if (alertClosed) {
            return null;
        }
        if (isEmpty(application.connections)) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Info}
                       asChild={true}
                       message={I18n.t("connection.welcome", {user: user.name, name: application.name})}/>
            )
        }
        if (testConnectionComplete && !productionConnectionComplete) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Info}
                       asChild={true}
                       message={I18n.t("connection.productionConnectionHint")}/>
            )
        }
        if (productionConnectionComplete && !appInformationComplete) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Warning}
                       asChild={true}
                       message={I18n.t("connection.applicationInformationHint")}/>
            )
        }
        if (productionConnectionComplete && productionConnectionNeedsActivation)
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Warning}
                       asChild={true}
                       message={I18n.t("connection.productionActivationHint")}
                       action={() => setTab("prod")}
                       actionLabel={I18n.t("connection.productionActivationAction")}/>
            )
    }

    return (
        <div className="application-connection-form">
            {alertInfo()}
            <div className="application-connection">
                <section className="sub-part">
                    <h2>{I18n.t("connection.test.name")}</h2>
                    <StatusLink info={I18n.t("connection.test.connections")}
                                action={() => initConnection(ENVIRONMENTS.TEST)}
                                status={testConnectionComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                </section>
                <section className="sub-part">
                    <h2>{I18n.t("connection.team.name")}</h2>
                    <StatusLink info={I18n.t("connection.team.members")}
                                action={() => setTab("appteam")}
                                status={STATUS_LINK_TYPE.TEAM}/>
                </section>
                <section className="sub-part">
                    <h2>{I18n.t("connection.production.name")}</h2>
                    <StatusLink info={I18n.t("connection.production.connections")}
                                action={() => initConnection(ENVIRONMENTS.PROD)}
                                disabled={!testConnectionComplete}
                                status={!productionConnectionComplete ? STATUS_LINK_TYPE.PENDING :
                                    productionConnectionNeedsActivation ? STATUS_LINK_TYPE.ALERT : STATUS_LINK_TYPE.ACTIVE}/>
                    <StatusLink info={I18n.t("connection.production.catalogue")}
                                action={() => setTab("application")}
                                disabled={!productionConnectionComplete}
                                status={appInformationComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    {/*<StatusLink info={I18n.t("connection.production.access")}*/}
                    {/*            action={() => setTab("testing")}*/}
                    {/*            disabled={!appInformationComplete}*/}
                    {/*            status={accessComplete}/>*/}
                    <StatusLink info={I18n.t("connection.production.contract")}
                                action={() => setTab("contract")}
                                disabled={!appInformationComplete}
                                status={application.signedContract ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <p className={`${productionConnectionComplete} ? "":"pending`}>
                        {I18n.t("connection.production.disclaimer")}
                    </p>
                </section>
            </div>
        </div>
    )
}
