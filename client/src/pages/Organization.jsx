import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertType, Button, Chip, ChipType, Loader} from "@surfnet/sds";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ImageNotFound from "../icons/image-not-found.svg";
import Divider from "../icons/divider.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";
import CardView from "@surfnet/sds/icons/functional-icons/card-view.svg";
import ListView from "@surfnet/sds/icons/functional-icons/list-or-table-view.svg";
import {convertServerApplicationToClient} from "../utils/Application.js";
import {CONNECTION_STATUSES, ENVIRONMENTS} from "../utils/Manage.js";
import {authorities, currentUserMembershipAuthority, isOrganizationAdmin} from "../utils/Permissions.js";
import {dateFromEpoch} from "../utils/Date.js";
import {Entities} from "../components/Entities.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";

const views = {
    card: "card",
    list: "list"
}

const Organization = () => {
    const {user} = useAppStore(state => state);
    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(views.card);
    const [organization, setOrganization] = useState({});
    const [alertClosed, setAlertClosed] = useState(false);
    const [isExternal, setIsExternal] = useState(true);
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationById(organizationId)
                .then(res => {
                    res.applications = res.applications.map(application => convertServerApplicationToClient(application))
                    setOrganization(res);
                    useAppStore.setState({
                        currentOrganization: res,
                        breadcrumbPaths: [
                            {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                            {path: `/organization/${res.id}`, value: res.name, menuItemName: mainMenuItems.yourApps},
                            {value: I18n.t("breadCrumb.applications")}
                        ]
                    });
                    const membership = (user.organizationMemberships || []).find(membership => membership.organization.id === res.id);
                    const authority = currentUserMembershipAuthority(user, membership);
                    setCurrentUserAuthority(authority);
                    setIsExternal(user.externalUser);
                    setLoading(false);
                }).catch(() => {
                navigate("/home")
            });
        }
    }, [navigate, organizationId, user]);

    const alertInfo = () => {
        if (alertClosed || organization.applicationCount > 0) {
            return null;
        }
        return (
            <Alert close={() => setAlertClosed(true)}
                   alertType={AlertType.Info}
                   asChild={true}
                   message={I18n.t("organization.alertInfo")}/>
        )
    }

    const renderApplicationStatus = application => {
        const prodConnections = (application.connections || []).filter(conn => conn.environment === ENVIRONMENTS.PROD);
        let status = "";
        if (prodConnections.length === 0) {
            status = "in_progress";
        } else if (prodConnections.length > 1) {
            status = "multiple_connections"
        } else {
            const connection = prodConnections[0];
            if (!application.signedContract) {
                status = "in_progress";
            }
            if (application.signedContract && (
                connection.status === CONNECTION_STATUSES.COMPLETE || connection.status === CONNECTION_STATUSES.IN_PROGRESS)) {
                status = "ready_for_prod"
            } else if (!isEmpty(connection.changeRequests)) {
                status = "open_change_requests";
            } else {
                status = connection.status.toLowerCase();
            }
        }
        return (
            <Chip type={ChipType.Status_error}
                  className={status}
                  label={I18n.t(`connection.connections.${status}`)}/>
        );
    }

    if (loading) {
        return <Loader/>
    }

    const renderCardViewApplications = () => {
        return (
            <div className="applications">
                {organization.applications
                    .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))
                    .map((application, index) =>
                        <div key={index} className="first-application">
                            <div
                                className="application"
                                onClick={() => navigate(`/connection/${application.id}`)}>
                                {isEmpty(application.logoUrl) ? <ImageNotFound/> :
                                    <img src={application.logoUrl} alt={application.name}/>}
                                <div className="application-info">
                                    <h4>{application.name}</h4>
                                </div>
                                {renderApplicationStatus(application)}
                                <span className="navigation"><ArrowRight/></span>
                            </div>
                            {(index === 0 && currentUserAuthority !== authorities.GUEST) &&
                                <Button onClick={() => navigate("/application/new")}
                                        txt={I18n.t("organization.addApplication")}/>}
                        </div>
                    )}
            </div>
        );
    }

    const renderListViewApplications = () => {
        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: application => isEmpty(application.logoUrl) ? <ImageNotFound/> :
                    <img src={application.logoUrl} alt={application.name}/>
            },
            {
                key: "name",
                header: I18n.t("accessibleApps.name"),
                mapper: application => application.name
            },
            {
                key: "createdAt",
                header: I18n.t("accessibleApps.created"),
                mapper: application => dateFromEpoch(application.createdAt)
            },
            {
                nonSortable: true,
                key: "white-space",
                header: "",
                mapper: () => ""
            }

        ];
        return (
                <Entities
                    entities={organization.applications
                        .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))}
                    modelName="application-list-view"
                    newLabel={I18n.t("organization.addApplication")}
                    defaultSort="name"
                    columns={columns}
                    hideTitle={true}
                    showNew={user.superUser || isOrganizationAdmin(user, organization)}
                    displaySearch={true}
                    searchAttributes={["name"]}
                    rowLinkMapper={(e, application) => navigate(`/connection/${application.id}`)}
                    newEntityFunc={() => navigate("/application/new")}
                    inputFocus={true}/>
        );
    }

    return (
        <div
            className={`organization-outer-container ${isEmpty(organization.applications) ? "" : "with-applications"}`}>
            {alertInfo()}
            <div className={`organization-header-container ${view === views.card ? "card-view" : ""}`}>
                <div>
                    <h1>{I18n.t("organization.applicationManagement")}</h1>
                    {!isEmpty(organization.applications) &&
                        <p>{I18n.t("organization.info", {name: organization.name})}</p>}
                </div>
                <div className="view-switcher">
                    <CardView className={`${view === views.card ? "active": ""}`} onClick={() => setView(views.card)}/>
                    <Divider/>
                    <ListView className={`${view === views.list ? "active": ""}`} onClick={() => setView(views.list)} v/>
                </div>
            </div>
            <div className="organization-container">
                {isEmpty(organization.applications) &&
                    <div className="organization">
                        <div className="left">
                            <Logo/>
                            <Button onClick={() => navigate("/application/new")}
                                    txt={I18n.t("organization.addFirstApplication")}/>
                        </div>
                        <div className="right">
                            <p className="terms">{I18n.t("organization.catalog.terms")}</p>
                            <ul>
                                <li><p
                                    dangerouslySetInnerHTML={{__html: I18n.t(`organization.catalog.fairUse${isExternal ? "External" : ""}`)}}/>
                                </li>
                                <li><p
                                    dangerouslySetInnerHTML={{__html: I18n.t(`organization.catalog.agreement${isExternal ? "External" : ""}`)}}/>
                                </li>
                            </ul>
                            <p dangerouslySetInnerHTML={{__html: I18n.t(`organization.catalog.disclaimer${isExternal ? "External" : ""}`)}}/>
                        </div>
                    </div>}
                {!isEmpty(organization.applications) && view === views.card ? renderCardViewApplications() : renderListViewApplications()}
            </div>
        </div>

    )
};
export default Organization;