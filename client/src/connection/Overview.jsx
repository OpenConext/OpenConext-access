import "./Overview.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Alert, AlertType} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import {StatusLink} from "../components/StatusLink.jsx";


export const Overview = ({user, application}) => {

    const [alertClosed, setAlertClosed] = useState(false);

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
                    <StatusLink info={I18n.t("connection.production.catalogue")}
                                action={() => setTab("testing")}
                                disabled={true}
                                status="pending"/>
                    <StatusLink info={I18n.t("connection.production.access")}
                                action={() => setTab("testing")}
                                disabled={true}
                                status="pending"/>
                    <StatusLink info={I18n.t("connection.production.contract")}
                                action={() => setTab("testing")}
                                disabled={true}
                                status="pending"/>
                    <p className="pending">{I18n.t("connection.production.disclaimer")}</p>
                </section>
            </div>
        </div>
    )
}
