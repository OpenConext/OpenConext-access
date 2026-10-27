import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertDescription, AlertTitle, Button, Spinner} from "@surfnet/curve-react";
import {AppWindowIcon, HourglassIcon, InfoIcon, PlusCircleIcon} from "@phosphor-icons/react";
import {ConnectionAlert} from "../connection/ConnectionAlert.jsx";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router";
import {menu, organizationApplicationsById, organizationMineById} from "../api/index.js";
import {isEmpty, sanitize} from "../utils/Utils.js";
import ImageNotFound from "../icons/image-not-found.svg";
import DOMPurify from "dompurify";
import {applicationPath, contactPersonTypes, convertServerApplicationToClient} from "../utils/Application.js";
import {ApplicationStatusBadge} from "../components/ApplicationStatusBadge.jsx";
import {hasApplicationWriteAccess, hasCreateApplicationAccess} from "../utils/Permissions.js";
import {dateFromEpoch} from "../utils/Date.js";
import {Entities} from "../components/Entities.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {isValidEmail} from "../validations/regExps.js";
import {useShallow} from "zustand/react/shallow";
import {getParameterByName} from "../utils/QueryParameters.js";
import {currentOrganizationFromUser, showContractRequiredBanner} from "../utils/Organization.js";


const views = {
    card: "card",
    list: "list"
}

const Organization = () => {

    const {user, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
    })));

    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const view = views.list;
    const [organization, setOrganization] = useState({});
    const [isExternal, setIsExternal] = useState(true);
    const [mayCreateApplication, setMayCreateApplication] = useState(false);
    const [contactEmail, setContactEmail] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationApplicationsById(organizationId)
                .then(res => {
                    res.applications = res.applications.map(application => {
                        const converted = convertServerApplicationToClient(application);
                        //own property so it can be used as a sortable column key without colliding with the connections array itself
                        converted.connectionCount = (converted.connections || []).length;
                        return converted;
                    })
                    setOrganization(res);
                    //the URL may be bookmarked
                    const organization = currentOrganizationFromUser(user, organizationId)
                    useAppStore.setState({
                        currentOrganization: organization,
                        activeMenuItem: mainMenuItems.yourApps,
                        breadcrumbPaths: [
                            {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                            {value: I18n.t("navigation.yourApps")}
                        ]
                    });
                    menu(organizationId).then(menuResponse => useAppStore.setState({menuItems: menuResponse.menuItems}));
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
                //Without a home (see HomeSwitch) navigating to /home would redirect back to this page, resulting in a loop
                if (useAppStore.getState().menuItems.includes(mainMenuItems.home)) {
                    navigate("/home");
                } else {
                    setLoading(false);
                }
            });
        }
    }, [navigate, organizationId, user]);

    const alertInfo = () => {
        //Set after the creation of an organization, which has no home to show this on
        if (getParameterByName("new")) {
            return (
                <Alert variant={"info"}>
                    <HourglassIcon/>
                    <AlertTitle dangerouslySetInnerHTML={{__html: sanitize(I18n.t("userHome.newOrganizationTitle", {name: currentOrganization?.name}))}}/>
                    <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(I18n.t("userHome.newOrganizationDescription"))}}/>
                </Alert>
            );
        }
        if (showContractRequiredBanner(user, currentOrganization)) {
            //Regardless of the number of applications, the admin must supply the details for the agreement
            return <ConnectionAlert application={{connections: []}}
                                    currentOrganization={currentOrganization}
                                    fullWidth={true}/>;
        }
        if (organization.applicationCount > 0 || mayCreateApplication) {
            //The zero state card has its own explanation
            return null;
        }
        return (
            <Alert variant={"info"}>
                <InfoIcon/>
                <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(I18n.t("organization.alertInfo"))}}/>
            </Alert>
        )
    }

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
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
                key: "type",
                header: I18n.t("accessibleApps.type"),
                mapper: () => I18n.t("organization.app")
            },
            {
                key: "status",
                header: I18n.t("accessibleApps.status"),
                mapper: application => <ApplicationStatusBadge application={application}/>
            },
            {
                key: "connectionCount",
                header: I18n.t("accessibleApps.connections"),
                mapper: application => application.connectionCount
            },
            {
                key: "createdAt",
                header: I18n.t("accessibleApps.created"),
                mapper: application => dateFromEpoch(application.createdAt)
            }

        ];
        return (
            <Entities
                entities={organization.applications
                    .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))}
                modelName="application-list-view"
                defaultSort="name"
                columns={columns}
                hideTitle={true}
                showNew={false}
                displaySearch={true}
                searchAttributes={["name"]}
                rowLinkMapper={(e, application) => hasApplicationWriteAccess(user, application) && navigate(applicationPath(application))}
                rowHrefMapper={application => hasApplicationWriteAccess(user, application) ? applicationPath(application) : undefined}
                rowOverrideClickable={application => !hasApplicationWriteAccess(user, application)}
                notAllowedTitle={I18n.t("organization.readOnly", {orgName: organization.name})}
                inputFocus={false}
                searchPlaceholder={I18n.t("application-list-view.searchPlaceHolder")}>
                {(user.superUser || hasCreateApplicationAccess(user, organization)) &&
                    <div className="button-group">
                        <Button onClick={() => navigate("/application/new")}
                                className={"no-title"}>
                            <span dangerouslySetInnerHTML={{__html: I18n.t("organization.addApplication")}}/>
                        </Button>
                    </div>}


            </Entities>
        );
    }

    //No applications yet, for a user that may add one
    const zeroState = isEmpty(organization.applications) && mayCreateApplication;
    return (
        <div
            className={`organization-outer-container ${isEmpty(organization.applications) ? "" : "with-applications"} ${zeroState ? "zero-state" : ""}`}>
            {!zeroState && alertInfo()}
            <div className={`organization-header-container ${view === views.card ? "card-view" : ""}`}>
                <div>
                    <h1 className="text-[length:var(--text-2xl-font-size)] mb-2">{I18n.t("organization.applicationManagement")}</h1>
                    {(!isEmpty(organization.applications) || zeroState) &&
                        <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("organization.info", {name: organization.name}))}}/>
                    }
                </div>
            </div>
            {zeroState && alertInfo()}
            <div className="organization-container">
                {zeroState &&
                    <div className="zero-state-card">
                        <div className="zero-state-icon">
                            <AppWindowIcon size={28}/>
                        </div>
                        <div className="zero-state-text">
                            <h3>{I18n.t("organization.zeroState.title")}</h3>
                            <p>{I18n.t("organization.zeroState.description")}</p>
                        </div>
                        <Button onClick={() => navigate("/application/new")}>
                            <PlusCircleIcon/>
                            <span>{I18n.t("organization.zeroState.action")}</span>
                        </Button>
                    </div>}
                {(isEmpty(organization.applications) && !mayCreateApplication) &&
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
                    <div>{renderListViewApplications()}</div>
                }
            </div>
        </div>

    )
};
export default Organization;
