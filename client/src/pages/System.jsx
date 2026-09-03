import "./System.scss";
import React, {useState} from "react";
import {Navigate, useNavigate, useParams} from "react-router";
import {Users} from "./Users.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import I18n from "../locale/I18n.js";
import {Organizations} from "./Organizations.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";
import {ManageImport} from "./ManageImport.jsx";
import ApplicationMigrate from "./ApplicationMigrate.jsx";
import {Cron} from "./Cron.jsx";
import {Seed} from "./Seed.jsx";
import {Contracts} from "./Contracts.jsx";

const tabNames = ["users", "organizations", "organizationPendingApproval", "contracts", "import", "migrate", "cron", "seed"]

const organizationTabs = ["organizations", "organizationPendingApproval"];

const System = () => {
    const {tab = "users"} = useParams();
    const [currentTab, setCurrentTab] = useState(tab);

    const navigate = useNavigate();

    const {user, config} = useAppStore(useShallow(state => ({
        user: state.user,
        config: state.config
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
        const newPath = `/system/${name}`;
        if (refreshRequired) {
            const encodedPath = encodeURIComponent(newPath);
            navigate(`/refresh-route/${encodedPath}`);
        } else {
            navigate(newPath, {replace: true});
        }
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
            case "contracts": {
                return <Contracts/>
            }
            case "import": {
                return <ManageImport />
            }
            case "migrate": {
                return <ApplicationMigrate />
            }
            case "cron": {
                return <Cron />
            }
            case "seed": {
                return <Seed />
            }
        }
    }


    return (
        <div className="system-outer-container">
            <TabHeader tab={currentTab}
                       setTab={tabChanged}
                       hrefFor={name => `/system/${name}`}
                       tabNames={config.demoSeedEnabled ? tabNames : tabNames.filter(tab => tab !== "seed")}
                       fullWidth={true}
            >
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("landing.header.system")}</h3>
            </TabHeader>
            <div className="system-container">
                {renderCurrentTab()}
            </div>
        </div>
    )
};
export default System;