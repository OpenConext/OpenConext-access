import "./UserManagement.scss";
import React, {useCallback, useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Spinner} from "@surfnet/curve-react";
import {useNavigate, useParams} from "react-router";
import {organizationUserManagementById} from "../api/index.js";
import {TeamManagement} from "./TeamManagement.jsx";
import {currentUserMembershipAuthority} from "../utils/Permissions.js";
import {JoinRequestManagement} from "./JoinRequestManagement.jsx";
import {InvitationManagement} from "./InvitationManagement.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import {isEmpty} from "../utils/Utils.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {currentOrganizationFromUser} from "../utils/Organization.js";

const tabNames = ["team", "invitations", "joins"]

export const UserManagement = ({refreshUser}) => {
    const user = useAppStore(state => state.user);

    const {tab = "team"} = useParams();
    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [currentTab, setCurrentTab] = useState(tab);
    const navigate = useNavigate();

    const fetchOrganization = useCallback(() => {
        organizationUserManagementById(organizationId)
            .then(res => {
                setOrganization(res);
                const organization = currentOrganizationFromUser(user, organizationId);
                useAppStore.setState({
                    currentOrganization: organization,
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                        {
                            path: `/users/${organizationId}`,
                            value: I18n.t("navigation.users"),
                            menuItemName: mainMenuItems.users
                        },
                        {value: I18n.t(`breadCrumb.${currentTab}`)}
                    ]
                });
                const membership = (user.organizationMemberships || []).find(
                    membership => membership.organization.id === res.id
                );
                const authority = currentUserMembershipAuthority(user, membership);
                setCurrentUserAuthority(authority);
                setLoading(false);
            })
            .catch(() => navigate("/home"));
    }, [organizationId, user, currentTab, navigate]);

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            fetchOrganization();
        }
    }, [fetchOrganization, navigate, organizationId]);

    const tabChanged = name => {
        setCurrentTab(name);
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.yourApps},
                {
                    path: `/users/${organizationId}`,
                    value: I18n.t("navigation.users"),
                    menuItemName: mainMenuItems.users
                },
                {value: I18n.t(`breadCrumb.${name}`)}
            ]
        });
        navigate(`/users/${organizationId}/${name}`);
    }

    const refreshState = () => {
        refreshUser(() => fetchOrganization())
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case  "team": {
                return <TeamManagement organization={organization}
                                       currentUserAuthority={currentUserAuthority}
                                       refreshState={refreshState}/>;
            }
            case  "joins": {
                return <JoinRequestManagement organization={organization}
                                              currentUserAuthority={currentUserAuthority}
                                              refreshState={refreshState}/>;
            }
            case  "invitations": {
                return <InvitationManagement organization={organization}
                                             currentUserAuthority={currentUserAuthority}
                                             refreshState={refreshState}/>;
            }
        }
    }


    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    return (
        <div
            className={`user-management-outer-container with-applications`}>
            <TabHeader tab={currentTab}
                       setTab={tabChanged}
                       tabNames={tabNames}
            >
                <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("userManagement.title")}</h1>
            </TabHeader>
            <div className="user-management-container">
                {renderCurrentTab()}
            </div>
        </div>

    )
};
