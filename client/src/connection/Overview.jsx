import "./Overview.scss";
import React from "react";
import I18n from "../locale/I18n";
import {STATUS_LINK_TYPE, StatusLink} from "../components/StatusLink.jsx";
import {ConnectionAlert} from "./ConnectionAlert.jsx";
import {isEmpty} from "../utils/Utils.js";
import {useNavigate} from "react-router";

export const Overview = ({
                             user,
                             application,
                             currentOrganization,
                             setTab,
                             initConnection,
                             connectionComplete,
                             appInformationComplete,
                             connectionNeedsApproval,
                         }) => {
    const navigate = useNavigate();
    return (
        <div className="application-connection-form">
            <ConnectionAlert application={application}
                             user={user}
                             setTab={setTab}
                             currentOrganization={currentOrganization}
                             connectionComplete={connectionComplete}
                             connectionNeedsApproval={connectionNeedsApproval}
                             appInformationComplete={appInformationComplete}/>
            <div className="application-connection">
                <section className="sub-part">
                    <h2>{I18n.t("connection.alllConnections")}</h2>
                    <StatusLink info={I18n.t("connection.production.catalogue")}
                                action={() => setTab("application")}
                                disabled={false}
                                status={appInformationComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    <StatusLink info={I18n.t("connection.alllConnectionsInfo", {name: application.name})}
                                action={() => initConnection()}
                                status={connectionComplete ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    {isEmpty(currentOrganization.manageIdentifier) &&
                    <StatusLink info={I18n.t("connection.production.contract")}
                                action={() => navigate(`/idp/${currentOrganization.id}/contract`)}
                        // disabled={!appInformationComplete || !testConnectionComplete}
                                disabled={false}
                                status={currentOrganization.contractSigned ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>}
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
