import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertDescription, Button, Spinner} from "@surfnet/curve-react";
import {Chip, ChipType} from "../components/Chip.jsx";
import {InfoIcon} from "@phosphor-icons/react";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router";
import {organizationApplicationsById, organizationMineById} from "../api/index.js";
import {isEmpty, sanitize} from "../utils/Utils.js";
import ImageNotFound from "../icons/image-not-found.svg";
import Divider from "../icons/divider.svg";
import {CaretRightIcon as ArrowRight, GridFourIcon as CardView, ListIcon as ListView} from "@phosphor-icons/react";
import DOMPurify from "dompurify";
import {contactPersonTypes, convertServerApplicationToClient} from "../utils/Application.js";
import {CONNECTION_STATUSES} from "../utils/Manage.js";
import {authorities, currentUserMembershipAuthority, hasApplicationWriteAccess, hasCreateApplicationAccess, isOrganizationMember} from "../utils/Permissions.js";
import {dateFromEpoch} from "../utils/Date.js";
import {Entities} from "../components/Entities.jsx";
import {mainMenuItems, menuItemsForUser} from "../utils/MenuItems.js";
import {isValidEmail} from "../validations/regExps.js";
import {useShallow} from "zustand/react/shallow";
import {currentOrganizationFromUser} from "../utils/Organization.js";


const views = {
    card: "card",
    list: "list"
}

const Organization = () => {

    const {user} = useAppStore(useShallow(state => ({
        user: state.user,
    })));

    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(views.card);
    const [organization, setOrganization] = useState({});
    const [isExternal, setIsExternal] = useState(true);
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [mayCreateApplication, setMayCreateApplication] = useState(false);
    const [contactEmail, setContactEmail] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationApplicationsById(organizationId)
                .then(res => {
                    res.applications = res.applications.map(application => convertServerApplicationToClient(application))
                    setOrganization(res);
                    const newMenuItems = menuItemsForUser(user, res);
                    //the URL may be bookmarked
                    const organization = currentOrganizationFromUser(user, organizationId)
                    useAppStore.setState({
                        currentOrganization: organization,
                        activeMenuItem: mainMenuItems.yourApps,
                        menuItems: newMenuItems,
                        breadcrumbPaths: [
                            {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                            {value: I18n.t("navigation.yourApps")}
                        ]
                    });
                    const membership = (user.organizationMemberships || []).find(membership => membership.organization.id === res.id);
                    const authority = currentUserMembershipAuthority(user, membership);
                    setCurrentUserAuthority(authority);
                    setIsExternal(user.externalUser);
                    const mayCreateApplicationVar = hasCreateApplicationAccess(user, res);
                    setMayCreateApplication(mayCreateApplicationVar);
                    if (!mayCreateApplicationVar) {
                        //We need to get the admin of this app - if any
                        organizationMineById(organizationId)
                            .then(res => {
                                const technicalEmail = (res.metaData?.contactPersons || [])
                                    .find(person => person.type === contactPersonTypes.technical && isValidEmail(person.email));
                                setContactEmail(technicalEmail?.email);
                                setLoading(false);
                            });

                    } else {
                        setLoading(false);
                    }

                }).catch(() => {
                navigate("/home")
            });
        }
    }, [navigate, organizationId, user]);

    const alertInfo = () => {
        if (organization.applicationCount > 0) {
            return null;
        }
        return (
            <Alert>
                <InfoIcon/>
                <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(I18n.t("organization.alertInfo"))}}/>
            </Alert>
        )
    }

    const renderApplicationStatus = application => {
        const connections = application.connections || [];
        // eslint-disable-next-line no-useless-assignment
        let status = "";
        if (connections.length === 0) {
            status = "in_progress";
        } else if (connections.length > 1) {
            status = "multiple_connections"
        } else {
            const connection = connections[0];
            if (connection.status === CONNECTION_STATUSES.COMPLETE) {
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
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const renderCardViewApplications = () => {
        return (
            <div className="applications">
                {organization.applications
                    .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))
                    .map((application, index) => {
                        const readOnly = !hasApplicationWriteAccess(user, application);
                        return (
                            <div key={index} className="first-application">
                                <div
                                    className={`application ${readOnly ? "read-only" : ""}`}
                                    title={readOnly ? I18n.t("organization.readOnly", {orgName: organization.name}) : ""}
                                    onClick={() => !readOnly && navigate(`/connection/${application.id}`)}>
                                    {isEmpty(application.logoUrl) ? <ImageNotFound/> :
                                        <img src={application.logoUrl} alt={application.name}/>}
                                    <div className="application-info">
                                        <h4>{application.name}</h4>
                                    </div>
                                    {renderApplicationStatus(application)}
                                    {!readOnly && <span className="navigation"><ArrowRight/></span>}
                                </div>
                                {(index === 0 && currentUserAuthority !== authorities.GUEST) &&
                                    <Button onClick={() => navigate("/application/new")}>
                                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("organization.addApplication"))}}/>
                                    </Button>}
                            </div>
                        )
                    })
                }
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
                key: "status",
                header: I18n.t("accessibleApps.status"),
                mapper: application => renderApplicationStatus(application)
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
                showNew={user.superUser || isOrganizationMember(user, organization)}
                displaySearch={true}
                searchAttributes={["name"]}
                rowLinkMapper={(e, application) => hasApplicationWriteAccess(user, application) && navigate(`/connection/${application.id}`)}
                rowOverrideClickable={application => !hasApplicationWriteAccess(user, application)}
                notAllowedTitle={I18n.t("organization.readOnly", {orgName: organization.name})}
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
                    <h1 className="text-[length:var(--text-2xl-font-size)] mb-[25px]">{I18n.t("organization.applicationManagement")}</h1>
                    {!isEmpty(organization.applications) &&
                        <p>{I18n.t("organization.info", {name: organization.name})}</p>}
                </div>
                {!isEmpty(organization.applications) &&
                    <div className="view-switcher">
                        <CardView className={`${view === views.card ? "active" : "nope"}`}
                                  onClick={() => setView(views.card)}/>
                        <Divider/>
                        <ListView className={`${view === views.list ? "active" : "nope"}`}
                                  onClick={() => setView(views.list)} v/>
                    </div>}
            </div>
            <div className="organization-container">
                {isEmpty(organization.applications) &&
                    <div className="organization">
                        <div className="left">
                            <Logo/>
                            {mayCreateApplication &&
                                <Button onClick={() => navigate("/application/new")}>
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("organization.addFirstApplication"))}}/>
                                </Button>}
                            {!mayCreateApplication &&
                                <div className="no-app">
                                    <p>{I18n.t("organization.guestNoApplicationMessage")}</p>
                                    {!isEmpty(contactEmail) &&
                                        <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("organization.guestNoApplicationMessageInfo", {mail: contactEmail}))}}/>
                                    }
                                </div>
                            }
                        </div>
                        <div className="right">
                            <p className="terms">{I18n.t("organization.catalog.terms")}</p>
                            <ul>
                                <li><p
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(I18n.t(`organization.catalog.fairUse${isExternal ? "External" : ""}`),
                                            {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})
                                    }}/>
                                </li>
                                <li><p
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(I18n.t(`organization.catalog.agreement${isExternal ? "External" : ""}`),
                                            {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})
                                    }}/>
                                </li>
                            </ul>
                            <p dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(I18n.t(`organization.catalog.disclaimer${isExternal ? "External" : ""}`),
                                    {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})
                            }}/>
                        </div>
                    </div>}
                {!isEmpty(organization.applications) &&
                    <div>{view === views.card ? renderCardViewApplications() : renderListViewApplications()}</div>
                }
            </div>
        </div>

    )
};
export default Organization;
