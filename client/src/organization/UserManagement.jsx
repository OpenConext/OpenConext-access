import "./UserManagement.scss";
import React, {useCallback, useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertAction, AlertDescription, Button, Spinner} from "@surfnet/curve-react";
import {InfoIcon} from "@phosphor-icons/react";
import {Link, useNavigate, useParams} from "react-router";
import {myRoles, organizationUserManagementById} from "../api/index.js";
import {TeamManagement} from "./TeamManagement.jsx";
import {currentUserMembershipAuthority} from "../utils/Permissions.js";
import {JoinRequestManagement} from "./JoinRequestManagement.jsx";
import {InvitationManagement} from "./InvitationManagement.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import {isEmpty} from "../utils/Utils.js";
import {inviteRolesHref, mainMenuItems} from "../utils/MenuItems.js";
import {currentOrganizationFromUser} from "../utils/Organization.js";

const tabNames = ["team", "invitations", "joins"]

export const UserManagement = ({refreshUser}) => {
    const user = useAppStore(state => state.user);
    const config = useAppStore(state => state.config);

    const {tab = "team"} = useParams();
    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [currentTab, setCurrentTab] = useState(tab);
    const [hasRoles, setHasRoles] = useState(false);
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
                    ],
                    activeMenuItem: mainMenuItems.users
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

    useEffect(() => {
        //Invite can be unavailable, the alert is only a hint
        myRoles()
            .then(res => setHasRoles(!isEmpty(res)))
            .catch(() => setHasRoles(false));
    }, []);

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
                       hrefFor={name => `/users/${organizationId}/${name}`}
                       tabNames={tabNames}
            >
                <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("userManagement.title")}</h1>
                {hasRoles && <Alert variant="info" className="roles-alert">
                    <InfoIcon/>
                    <AlertDescription className="alert-description-with-action">
                        <span className="alert-text">
                            <strong className="alert-text-title">{I18n.t("userManagement.rolesHintTitle")}</strong>
                            <span>{I18n.t("userManagement.rolesHintDescription")}</span>
                        </span>
                        <AlertAction>
                            <Link to={inviteRolesHref(config, organization.id)}
                                  onClick={() => useAppStore.setState({activeMenuItem: mainMenuItems.invite})}>
                                <Button size="sm" variant="outline">
                                    {I18n.t("userManagement.rolesHintAction")}
                                </Button>
                            </Link>
                        </AlertAction>
                    </AlertDescription>
                </Alert>}
            </TabHeader>
            <div className="user-management-container">
                {renderCurrentTab()}
            </div>
        </div>

    )
};
