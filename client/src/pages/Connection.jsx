import "./ApplicationConnection.scss";
import React, {useEffect, useMemo, useState} from "react";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Connections} from "../connection/Connections.jsx";
import {getApplicationById, getIdentityProviders} from "../api/index.js";
import {Loader} from "@surfnet/sds";
import {APPLICATION_STATUSES, CONNECTION_STATUSES, PROTOCOLS} from "../utils/Manage.js";
import {AppInformation} from "../connection/AppInformation.jsx";
import {contactSectionValid, convertServerApplicationToClient, logoSectionValid, privacySectionValid} from "../utils/Application.js";
import {AppTeamManagement} from "../application/AppTeamManagement.jsx";
import {connectOptions, visibilities} from "../utils/Connection.js";
import {isEmpty} from "../utils/Utils.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";

const tabNames = ["overview", "application", "allConnections", "appteam"]

const protocolOptions = Object.values(PROTOCOLS).map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol.toLowerCase()}`)
}));

export const Connection = () => {
    const {applicationId, tab = "overview", connectionId} = useParams();
    const {user, config, currentOrganization, arp, privacy} = useAppStore(useShallow(state => ({
        user: state.user,
        config: state.config,
        currentOrganization: state.currentOrganization,
        arp: state.arp,
        privacy: state.privacy,

    })));

    const [application, setApplication] = useState({organization: {}});
    const [profileOptions, setProfileOptions] = useState([]);
    const [currentTab, setCurrentTab] = useState(tab);
    const [connection, setConnection] = useState(null);
    const [identityProviders, setIdentityProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        getApplicationById(applicationId)
            .then(res => {
                //For convenience editing
                const options = arp.profiles.map(profile => ({
                    value: profile.name,
                    label: (<div>
                        <b>{I18n.t(`connection.informational.profiles.${profile.name}.name`)}</b>
                        <br/>
                        {I18n.t(`connection.informational.profiles.${profile.name}.title`)}
                    </div>)
                }));
                setApplication(convertServerApplicationToClient(res, protocolOptions, options, arp));
                setProfileOptions(options);
                // changeTab(currentTab);
                setLoading(false);
                useAppStore.setState({
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                        {
                            path: `/organization/${res.organization.id}`,
                            value: I18n.t(`navigation.${mainMenuItems.yourApps}`),
                            menuItemName: mainMenuItems.yourApps
                        },
                        {value: res.name}
                    ]
                });
                getIdentityProviders().then(providers => {
                    setIdentityProviders(providers);
                })
            })
    }, [applicationId, arp]);

    const {
        connectionComplete,
        appInformationComplete,
        connectionNeedsApproval,
    } = useMemo(() => {
        return {
            connectionComplete: !isEmpty(application.connections) &&
                application.connections
                    .some(conn => conn.status !== CONNECTION_STATUSES.OPEN),
            appInformationComplete: logoSectionValid(application) && contactSectionValid(application) && privacySectionValid(privacy, application)
                && application.status !== APPLICATION_STATUSES.OPEN,
            connectionNeedsApproval: (application.signedContract || !isEmpty(currentOrganization.manageIdentifier)) && !isEmpty(application.connections) &&
                application.connections
                    .some(conn => conn.status === CONNECTION_STATUSES.COMPLETE)
        }
    }, [application, privacy, currentOrganization.manageIdentifier]);


    const refresh = (newTab = null) => {
        setLoading(true);
        getApplicationById(applicationId)
            .then(res => {
                setApplication(convertServerApplicationToClient(res, protocolOptions, profileOptions, arp));
                if (!isEmpty(newTab)) {
                    navigate(`/connection/${applicationId}/${newTab}`)
                }
                setConnection(null);
                setDirty(false);
                setLoading(false);
            })
    }

    const initConnection = (forceNew = false) => {
        const iDps = config.identityProviders;
        setConnection({
            new: forceNew,
            protocol: protocolOptions[0],
            grantTypes: ["authorization_code"],
            pkce: false,
            entityID: "",
            redirectUrls: [""],
            acsLocations: null,
            metaData: {},
            status: CONNECTION_STATUSES.OPEN,
            motivations: {},
            additionalAttributes: [],
            changeRequests: [],
            profile: application.type === "APP" ? profileOptions[0] : profileOptions[1],
            profileMotivation: "",
            allowedEntities: iDps.map(idp => idp.entityid),
            visibility: visibilities.visible_to_all,
            connectOption: connectOptions.connect_with_interaction,
            sectionsComplete: 0
        });
        const newTab = "allConnections";
        setCurrentTab(newTab);
        navigate(`/connection/${applicationId}/${newTab}`);
    }

    const changeTab = (newTab, action = null) => {
        if (dirty) {
            refresh()
        }
        if (currentTab === "allConnections") {
            //force the overview
            setConnection(null);
        }
        setCurrentTab(newTab);
        const queryPart = action !== null ? `?action=${action}` : "";
        navigate(`/connection/${applicationId}/${newTab}${queryPart}`);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case "overview": {
                return <Overview application={application}
                                 user={user}
                                 currentOrganization={currentOrganization}
                                 initConnection={initConnection}
                                 setTab={changeTab}
                                 connectionComplete={connectionComplete}
                                 appInformationComplete={appInformationComplete}
                                 connectionNeedsApproval={connectionNeedsApproval}
                />
            }
            case  "allConnections": {
                return <Connections application={application}
                                    connection={connection}
                                    user={user}
                                    currentOrganization={currentOrganization}
                                    connectionComplete={connectionComplete}
                                    appInformationComplete={appInformationComplete}
                                    connectionNeedsApproval={connectionNeedsApproval}
                                    setConnection={setConnection}
                                    initConnection={initConnection}
                                    refresh={refresh}
                                    protocolOptions={protocolOptions}
                                    arpInfo={arp}
                                    setTab={changeTab}
                                    profileOptions={profileOptions}
                                    identityProviders={identityProviders}
                                    isProduction={false}
                                    setDirty={setDirty}
                                    connectionId={connectionId}

                />
            }
            case "application": {
                return <AppInformation application={application}
                                       setApplication={setApplication}
                                       refresh={refresh}
                                       changeTab={changeTab}
                                       privacyInfo={privacy}
                                       protocolOptions={protocolOptions}
                                       profileOptions={profileOptions}
                                       arpInfo={arp}
                />
            }
            case "appteam": {
                return <AppTeamManagement application={application}
                                          refresh={refresh}
                />
            }
        }
    }

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="application-connection-container">
            <ApplicationConnectionHeader tabs={tabNames
                .map(name => ({
                    name: name,
                    disabled: false
                }))}
                                         application={application}
                                         currentTab={currentTab}
                                         setLoading={setLoading}
                                         user={user}
                                         setTab={changeTab}/>
            {renderCurrentTab()}
        </div>
    )
}
