import "./UserManagement.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Loader} from "@surfnet/sds";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";
import {convertServerApplicationToClient} from "../utils/Application.js";
import {TeamManagement} from "./TeamManagement.jsx";
import {currentUserMembershipAuthority} from "../utils/Permissions.js";
import {JoinRequestManagement} from "./JoinRequestManagement.jsx";
import {InvitationManagement} from "./InvitationManagement.jsx";
import {TabHeader} from "../components/TabHeader.jsx";

const tabNames = ["team", "invitations", "joins"]

export const UserManagement = () => {
    const {user} = useAppStore(state => state);
    const {tab = "team"} = useParams();
    const {organizationId} = useParams();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [refresh, setRefresh] = useState(-1);
    const [currentTab, setCurrentTab] = useState(tab);
    const navigate = useNavigate();

    useEffect(() => {
        organizationById(organizationId)
            .then(res => {
                res.applications = res.applications.map(application => convertServerApplicationToClient(application))
                setOrganization(res);
                useAppStore.setState({
                    currentOrganization: res,
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: "yourApps"},
                        {path: `/organization/${res.id}`, value: res.name, menuItemName: "yourApps"},
                        {value: I18n.t("breadCrumb.applications")}
                    ]
                });
                const membership = (user.organizationMemberships || []).find(membership => membership.organization.id === res.id);
                setCurrentUserAuthority(currentUserMembershipAuthority(user, membership));
                tabChanged(currentTab, res);
                setLoading(false);
            }).catch(() => {
            navigate("/404")
        });
    }, [organizationId, refresh]);

    const tabChanged = (name, res) => {
        setCurrentTab(name);
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"),menuItemName: "yourApps"},
                {path: `/organization/${organizationId}`, value: res ? res.name : organization.name, menuItemName: "yourApps"},
                {value: I18n.t(`breadCrumb.${name}`)}
            ]
        });
        navigate(`/users/${organizationId}/${name}`);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case  "team": {
                return <TeamManagement organization={organization}
                                       currentUserAuthority={currentUserAuthority}
                                       setRefresh={setRefresh}/>;
            }
            case  "joins": {
                return <JoinRequestManagement organization={organization}
                                              currentUserAuthority={currentUserAuthority}
                                              setRefresh={setRefresh}/>;
            }
            case  "invitations": {
                return <InvitationManagement organization={organization}
                                             currentUserAuthority={currentUserAuthority}
                                             setRefresh={setRefresh}/>;
            }
            default:
                throw new Error(`Unknown tab; ${currentTab}`)
        }
    }


    if (loading) {
        return <Loader/>
    }

    return (
        <div
            className={`user-management-outer-container with-applications`}>
            <TabHeader tab={currentTab}
                       setTab={tabChanged}
                       tabNames={tabNames}
            >
                <h1>{I18n.t("userManagement.title")}</h1>
            </TabHeader>
            <div className="user-management-container">
                {renderCurrentTab()}
            </div>
        </div>

    )
};
