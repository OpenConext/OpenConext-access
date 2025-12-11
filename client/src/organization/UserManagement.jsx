import "./UserManagement.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Loader} from "@surfnet/sds";
import {useNavigate, useParams} from "react-router-dom";
import {organizationUserManagementById} from "../api/index.js";
import {convertServerApplicationToClient} from "../utils/Application.js";
import {TeamManagement} from "./TeamManagement.jsx";
import {currentUserMembershipAuthority} from "../utils/Permissions.js";
import {JoinRequestManagement} from "./JoinRequestManagement.jsx";
import {InvitationManagement} from "./InvitationManagement.jsx";
import {TabHeader} from "../components/TabHeader.jsx";
import {isEmpty} from "../utils/Utils.js";
import {mainMenuItems} from "../utils/MenuItems.js";

const tabNames = ["team", "invitations", "joins"]

export const UserManagement = () => {
    const user = useAppStore(state => state.user);

    const {tab = "team"} = useParams();
    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [refresh, setRefresh] = useState(-1);
    const [currentTab, setCurrentTab] = useState(tab);
    const navigate = useNavigate();

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationUserManagementById(organizationId)
                .then(res => {
                    res.applications = res.applications.map(application => convertServerApplicationToClient(application))
                    setOrganization(res);
                    useAppStore.setState({
                        currentOrganization: res,
                        breadcrumbPaths: [
                            {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                            {value: I18n.t("navigation.users")}
                        ]
                    });
                    const membership = (user.organizationMemberships || []).find(membership => membership.organization.id === res.id);
                    const authority = currentUserMembershipAuthority(user, membership);
                    setCurrentUserAuthority(authority);
                    tabChanged(currentTab);
                    setLoading(false);
                }).catch(() => {
                navigate("/home")
            });

        }
    }, [organizationId, refresh]);// eslint-disable-line react-hooks/exhaustive-deps

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
