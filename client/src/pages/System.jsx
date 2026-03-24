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
import {Manage} from "./Manage.jsx";

const tabNames = ["users", "organizations", "organizationPendingApproval", "manage"]

const organizationTabs = ["organizations", "organizationPendingApproval"];

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

    const tabChanged = name => {
        //We need to force a refresh if the tab change is between the two Organization components
        const refreshRequired = name !== currentTab && organizationTabs.includes(name) &&
            organizationTabs.includes(currentTab);
        setCurrentTab(name);
        const path = encodeURIComponent(`/system/${name}`);
        navigate(refreshRequired ? `/refresh-route/${path}` : path);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case "users": {
                return <Users/>
            }
            case "organizations": {
                return <Organizations pendingApproval={false} />
            }
            case  "organizationPendingApproval": {
                return <Organizations pendingApproval={true}/>
            }
            case "manage": {
                return <Manage />
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