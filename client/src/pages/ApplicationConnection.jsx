import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {Alert, AlertType} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {StatusLink} from "../components/StatusLink.jsx";

const tabNames = ["overview", "testing", "prod", "application", "contract"]

export const ApplicationConnection = () => {

    const {user} = useAppStore(state => state);

    const {id} = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState({});
    const [tab, setTab] = useState("overview");
    const [alertClosed, setAlertClosed] = useState(false);

    useEffect(() => {
        //todo fetch application
        const newApplication = {id: 6, name: "BuddyCheck", connections: []};
        setApplication(newApplication)
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {path: "/organizations/", value: "TODO Org Name"},
                {path: `/application/${newApplication.id}`, value: I18n.t("breadCrumb.applications")},
                {value: newApplication.name}
            ]
        });
    }, [id]);

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
    }

    return (
        <div className="application-connection-container">
            <ApplicationConnectionHeader tabNames={tabNames}
                                         application={application}
                                         tab={tab}
                                         setTab={setTab}/>
            <div className="application-connection-form">
                {alertInfo()}
                <div className="application-connection">
                    <section className="sub-part">
                        <h2>{I18n.t("connection.test.name")}</h2>
                        <StatusLink info={I18n.t("connection.test.connections")}
                                    action={() => setTab("testing")}
                                    status="pending"/>
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
                                    action={() => setTab("testing")}
                                    disabled={true}
                                    status="pending"/>
                    </section>

                </div>
            </div>
        </div>
    )
}
