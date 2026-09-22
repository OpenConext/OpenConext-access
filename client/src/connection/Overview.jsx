import "./Overview.scss";
import React from "react";
import I18n from "../locale/I18n";
import {STATUS_LINK_TYPE, StatusLink} from "../components/StatusLink.jsx";
import {ConnectionAlert} from "./ConnectionAlert.jsx";
import {ConnectionsOverviewList} from "./Connections.jsx";
import {Button} from "@surfnet/curve-react";
import {CaretRightIcon} from "@phosphor-icons/react";

export const Overview = ({
                             user,
                             application,
                             currentOrganization,
                             setTab,
                             initConnection,
                             viewConnection,
                             connectionComplete,
                             appInformationComplete,
                             connectionNeedsApproval,
                             logoValid,
                             contactValid,
                             privacyValid,
                         }) => {

    const teamMemberCount = (application.applicationMemberships || []).length;
    const includingYou = (application.applicationMemberships || []).some(appMembership => appMembership.userInfo.id === user.id);
    let includingYouLocale = "";
    if (includingYou) {
        includingYouLocale = I18n.t(`connection.overviewCards.${teamMemberCount === 1 ? "teamMemberSoloYou" : "teamMemberMultiYou"}`);
    }

    const renderCardHeader = (title, action) => (
        <div className="overview-card-header" onClick={action}>
            <h3 className="text-[length:var(--text-lg-font-size)]">{title}</h3>
            <CaretRightIcon/>
        </div>
    );

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
                <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("connection.overviewCards.title")}</h2>
                <p>{I18n.t("connection.overviewCards.subTitle")}</p>
                <div className="overview-cards">
                    <section className="card overview-card app-information-card">
                        {renderCardHeader(I18n.t("connection.overviewCards.appInformation"), () => setTab("application"))}
                        <StatusLink info={I18n.t("connection.overviewCards.appInformationLogo")}
                                    action={() => setTab("application")}
                                    disabled={false}
                                    status={logoValid ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                        <StatusLink info={I18n.t("connection.overviewCards.appInformationContact")}
                                    action={() => setTab("application")}
                                    disabled={false}
                                    status={contactValid ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                        <StatusLink info={I18n.t("connection.overviewCards.appInformationPrivacy")}
                                    action={() => setTab("application")}
                                    disabled={false}
                                    status={privacyValid ? STATUS_LINK_TYPE.ACTIVE : STATUS_LINK_TYPE.PENDING}/>
                    </section>
                    <section className="card overview-card connections-card">
                        {renderCardHeader(I18n.t("connection.overviewCards.connections"), () => setTab("allConnections"))}
                        <ConnectionsOverviewList application={application}
                                                 initConnection={initConnection}
                                                 viewConnection={viewConnection}/>
                    </section>
                    <section className="card overview-card app-team-card">
                        {renderCardHeader(I18n.t("connection.overviewCards.appTeam"), () => setTab("appteam"))}
                        <p className="team-count">
                            {teamMemberCount === 1 ?
                                I18n.t("connection.overviewCards.teamMemberSolo") + includingYouLocale :
                                I18n.t("connection.overviewCards.teamMemberMulti", {count: teamMemberCount}) + includingYouLocale}
                        </p>
                        <Button variant="outline"
                                className="manage-team-button"
                                onClick={() => setTab("appteam")}>
                            {I18n.t("connection.team.members")}
                        </Button>
                    </section>
                </div>
            </div>
        </div>
    )
}
