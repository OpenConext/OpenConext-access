import "./Overview.scss";
import React from "react";
import I18n from "../locale/I18n";
import {STATUS_LINK_TYPE, StatusLink} from "../components/StatusLink.jsx";
import {ConnectionAlert} from "./ConnectionAlert.jsx";


export const Overview = ({
                             user, application, setTab, initConnection, testConnectionComplete,
                             productionConnectionComplete, appInformationComplete,
                             productionConnectionNeedsActivation
                         }) => {

    return (
        <div className="application-connection-form">
            <ConnectionAlert application={application}
                             user={user}
                             productionOnly={false}
                             setTab={setTab}
                             testConnectionComplete={testConnectionComplete}
                             productionConnectionComplete={productionConnectionComplete}
                             appInformationComplete={appInformationComplete}
                             productionConnectionNeedsActivation={productionConnectionNeedsActivation}/>
            <div className="application-connection">
                <section className="sub-part">
                    <h2>{I18n.t("connection.test.name")}</h2>
                    <StatusLink info={I18n.t("connection.test.connections")}
                                action={() => initConnection()}
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
                                action={() => initConnection()}
                                disabled={!testConnectionComplete}
                                status={!productionConnectionComplete ? STATUS_LINK_TYPE.PENDING :
                                    productionConnectionNeedsActivation ? STATUS_LINK_TYPE.ALERT : STATUS_LINK_TYPE.ACTIVE}/>
                    <StatusLink info={I18n.t("connection.production.catalogue")}
                                action={() => setTab("application")}
                                disabled={!testConnectionComplete}
                                status={appInformationComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <StatusLink info={I18n.t("connection.production.contract")}
                                action={() => setTab("contract")}
                                // disabled={!appInformationComplete || !testConnectionComplete}
                                disabled={!testConnectionComplete}
                                status={application.signedContract ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <p className={`${productionConnectionComplete} ? "":"pending`}>
                        {I18n.t("connection.production.disclaimer")}
                    </p>
                </section>
            </div>
        </div>
    )
}
