import "./System.scss";
import React, {useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Users} from "./Users.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import I18n from "../locale/I18n.js";
import {Organizations} from "./Organizations.jsx";

const tabNames = ["users", "organizations", "organizationPendingApproval"]

const System = () => {
    const {tab = "users"} = useParams();
    const [currentTab, setCurrentTab] = useState(tab);
    const navigate = useNavigate();

    const tabChanged = (name) => {
        setCurrentTab(name);
        const path = encodeURIComponent(`/system/${name}`);
        navigate(`/refresh-route/${path}`);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case "users": {
                return <Users/>
            }
            case "organizations": {
                return <Organizations pendingApproval={false} tab={currentTab}/>
            }
            case  "organizationPendingApproval": {
                return <Organizations pendingApproval={true} tab={currentTab}/>
            }
            default:
                throw new Error(`Unknown tab; ${currentTab}`)
        }
    }


    return (
        <div className="system-outer-container">
            <TabHeader tab={currentTab}
                       setTab={tabChanged}
                       tabNames={tabNames}
                       fullWidth={true}
            >
                <h3>{I18n.t("landing.header.system")}</h3>
            </TabHeader>
            <div className="system-container">
                {renderCurrentTab()}
            </div>
        </div>

    )
};
export default System;