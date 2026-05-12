import "./Overview.scss";
import React from "react";
import I18n from "../locale/I18n";
import {STATUS_LINK_TYPE, StatusLink} from "../components/StatusLink.jsx";
import {ConnectionAlert} from "./ConnectionAlert.jsx";


export const Overview = ({
                             user, application, setTab, initConnection, connectionComplete,
                             appInformationComplete, connectionNeedsApproval,
                         }) => {

    return (
        <div className="application-connection-form">
            <ConnectionAlert application={application}
                             user={user}
                             setTab={setTab}
                             connectionComplete={connectionComplete}
                             connectionNeedsApproval={connectionNeedsApproval}
                             appInformationComplete={appInformationComplete}/>
            <div className="application-connection">
                <section className="sub-part">
                    <h2>{I18n.t("connection.alllConnections")}</h2>
                    <StatusLink info={I18n.t("connection.alllConnectionsInfo", {name: application.name})}
                                action={() => initConnection()}
                                status={connectionComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <StatusLink info={I18n.t("connection.production.catalogue")}
                                action={() => setTab("application")}
                                disabled={false}
                                status={appInformationComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <StatusLink info={I18n.t("connection.production.contract")}
                                action={() => setTab("contract")}
                        // disabled={!appInformationComplete || !testConnectionComplete}
                                disabled={false}
                                status={application.signedContract ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <p className={`${connectionNeedsApproval} ? "":"pending`}>
                        {I18n.t("connection.production.disclaimer")}
                    </p>
                </section>
                <section className="sub-part">
                    <h2>{I18n.t("connection.team.name")}</h2>
                    <StatusLink info={I18n.t("connection.team.members")}
                                action={() => setTab("appteam")}
                                status={STATUS_LINK_TYPE.TEAM}/>
                </section>
            </div>
        </div>
    )
}
