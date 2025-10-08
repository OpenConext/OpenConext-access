import "./System.scss";
import React, {useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Users} from "./Users.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import I18n from "../locale/I18n.js";
import {Organizations} from "./Organizations.jsx";
import {OrganizationsPendingApproval} from "./OrganizationsPendingApproval.jsx";

const tabNames = ["users", "organizations", "organizationPendingApproval"]

const System = () => {
    const {tab = "users"} = useParams();
    const [currentTab, setCurrentTab] = useState(tab);
    const navigate = useNavigate();

    const tabChanged = (name) => {
        setCurrentTab(name);
        navigate(`/system/${name}`);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case "users": {
                return <Users/>
            }
            case "organizations": {
                return <Organizations/>
            }
            case  "organizationPendingApproval":{
                return <OrganizationsPendingApproval/>
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