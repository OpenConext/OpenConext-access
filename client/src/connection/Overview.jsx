import "./Overview.scss";
import React, {useMemo, useState} from "react";
import I18n from "../locale/I18n";
import {Alert, AlertType} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import {StatusLink} from "../components/StatusLink.jsx";
import {ENVIRONMENTS, STATUSES} from "../utils/Manage.js";


export const Overview = ({user, application, setTab, initConnection}) => {

    const [alertClosed, setAlertClosed] = useState(false);

    const {testConnectionComplete, productionConnectionComplete, appInformationComplete} =
        useMemo(() => ({
            testConnectionComplete: !isEmpty(application.connections) &&
                application.connections
                    .filter(conn => conn.environment === ENVIRONMENTS.TEST)
                    .some(conn => conn.status === STATUSES.COMPLETE),
            productionConnectionComplete: !isEmpty(application.connections) &&
                application.connections
                    .filter(conn => conn.environment === ENVIRONMENTS.PROD)
                    .some(conn => conn.status === STATUSES.COMPLETE),
            appInformationComplete: !isEmpty(application.logoUrl)
        }), []);

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

    }

    return (
        <div className="application-connection-form">
            {alertInfo()}
            <div className="application-connection">
                <section className="sub-part">
                    <h2>{I18n.t("connection.test.name")}</h2>
                    <StatusLink info={I18n.t("connection.test.connections")}
                                action={() => initConnection(ENVIRONMENTS.TEST)}
                                status={testConnectionComplete}/>
                </section>
                <section className="sub-part">
                    <h2>{I18n.t("connection.team.name")}</h2>
                    <StatusLink info={I18n.t("connection.team.members")}
                                action={() => setTab("testing")}
                                status="team"/>
                </section>
                <section className="sub-part">
                    <h2>{I18n.t("connection.production.name")}</h2>
                    <StatusLink info={I18n.t("connection.production.connections")}
                                action={() => initConnection(ENVIRONMENTS.PROD)}
                                disabled={!testConnectionComplete}
                                status={productionConnectionComplete}/>
                    <StatusLink info={I18n.t("connection.production.catalogue")}
                                action={() => setTab("testing")}
                                disabled={!productionConnectionComplete}
                                status={appInformationComplete}/>
                    {/*<StatusLink info={I18n.t("connection.production.access")}*/}
                    {/*            action={() => setTab("testing")}*/}
                    {/*            disabled={!appInformationComplete}*/}
                    {/*            status={accessComplete}/>*/}
                    <StatusLink info={I18n.t("connection.production.contract")}
                                action={() => setTab("testing")}
                                disabled={!appInformationComplete}
                                status={false}/>
                    <p className={`${productionConnectionComplete} ? "":"pending`}>
                        {I18n.t("connection.production.disclaimer")}
                    </p>
                </section>
            </div>
        </div>
    )
}
