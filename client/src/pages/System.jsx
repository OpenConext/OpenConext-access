import "./System.scss";
import React, {useState} from "react";
import {Navigate, useNavigate, useParams} from "react-router-dom";
import {Users} from "./Users.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import I18n from "../locale/I18n.js";
import {Organizations} from "./Organizations.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";

const tabNames = ["users", "organizations", "organizationPendingApproval"]

const System = () => {
    const {tab = "users"} = useParams();
    const [currentTab, setCurrentTab] = useState(tab);

    const navigate = useNavigate();

    const {user} = useAppStore(useShallow(state => ({
        user: state.user
    })));

    if (!user.superUser) {
        return <Navigate to={"/404"} replace/>;
    }

    useAppStore.setState({
        breadcrumbPaths: [
            {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
            {
                path: "/system",
                value: I18n.t("breadCrumb.system")
            },
            {value: I18n.t(`breadCrumb.${currentTab}`)}
        ],
        activeMenuItem: null
    });

    const tabChanged = (name) => {
        setCurrentTab(name);
        const path = encodeURIComponent(`/system/${name}`);
        //We need to force a refresh of the Organization component that is used twice
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