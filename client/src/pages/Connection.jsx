import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Testing} from "../connection/Testing.jsx";
import {arp, getApplicationById, getIdentityProviders, privacy} from "../api/index.js";
import {Loader} from "@surfnet/sds";
import {CONNECTION_STATUSES, ENVIRONMENTS, PROTOCOLS} from "../utils/Manage.js";
import {AppInformation} from "../connection/AppInformation.jsx";
import {convertServerApplicationToClient} from "../utils/Application.js";
import {Contract} from "../connection/Contract.jsx";
import {AppTeamManagement} from "../application/AppTeamManagement.jsx";
import {connectOptions, visibilities} from "../utils/Connection.js";

const tabNames = ["overview", "testing", "prod", "application", "contract", "appteam"]

const protocolOptions = Object.values(PROTOCOLS).map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol.toLowerCase()}`)
}));

export const Connection = () => {
    const {applicationId, tab = "overview"} = useParams();
    const {user, currentOrganization} = useAppStore(state => state);

    const [application, setApplication] = useState({});
    const [arpInfo, setArpInfo] = useState({profiles: [], attributes: []});
    const [privacyInfo, setPrivacyInfo] = useState([]);
    const [profileOptions, setProfileOptions] = useState([]);
    const [currentTab, setCurrentTab] = useState(tab);
    const [connection, setConnection] = useState(null);
    const [identityProviders, setIdentityProviders] = useState([]);
    const [prodIdentityProviders, setProdIdentityProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshApp, setRefreshApp] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            getApplicationById(applicationId),
            arp(),
            privacy()])
            .then(res => {
                //For convenience editing
                const options = res[1].profiles.map(profile => ({
                    value: profile.name,
                    label: (<div>
                        <b>{I18n.t(`connection.informational.profiles.${profile.name}.name`)}</b>
                        <br/>
                        {I18n.t(`connection.informational.profiles.${profile.name}.title`)}
                    </div>)
                }));
                setApplication(convertServerApplicationToClient(res[0], protocolOptions, options, res[1]));
                setArpInfo(res[1]);
                setPrivacyInfo(res[2])
                setProfileOptions(options);
                changeTab(currentTab);
                setLoading(false);
                useAppStore.setState({
                    breadcrumbPath: [
                        {path: "/home", value: I18n.t("breadCrumb.access")},
                        {path: `/organization/${currentOrganization.id}`, value: currentOrganization.name},
                        {path: `/application/${applicationId}`, value: I18n.t("breadCrumb.applications")},
                        {value: res.name}
                    ]
                });
                Promise.all([
                    getIdentityProviders(ENVIRONMENTS.TEST),
                    getIdentityProviders(ENVIRONMENTS.PROD)
                ]).then(providers => {
                        setIdentityProviders(providers[0]);
                        setProdIdentityProviders(providers[1]);

                    })
            })
    }, []);

    const refresh = () => {
        setLoading(true);
        getApplicationById(applicationId)
            .then(res => {
                setApplication(convertServerApplicationToClient(res, protocolOptions, profileOptions, arpInfo));
                setConnection(null);
                setLoading(false);
                setRefreshApp(new Date().getTime());
            })
    }

    const initConnection = (environment = ENVIRONMENTS.TEST, forceNew = false) => {
        const iDps = I18n.translations[I18n.locale].connection.testIdPs.identityProviders;
        setConnection({
            new: forceNew,
            environment: environment,
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
            profile: application.type === "APP" ? profileOptions[0] : profileOptions[1],
            profileMotivation: "",
            allowedEntities: iDps.map(idp => idp.entityid),
            visibility: visibilities.visible_to_all,
            connectOption: connectOptions.connect_with_interaction
        });
        const newTab = environment === ENVIRONMENTS.TEST ? "testing" : "prod";
        setCurrentTab(newTab);
        navigate(`/connection/${applicationId}/${newTab}`);
    }

    const changeTab = newTab => {
        if (currentTab === "testing" || currentTab === "prod") {
            //force the overview
            setConnection(null);
        }
        setCurrentTab(newTab);
        navigate(`/connection/${applicationId}/${newTab}`);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case "overview": {
                return <Overview application={application}
                                 user={user}
                                 initConnection={initConnection}
                                 setTab={changeTab}
                                 privacyInfo={privacyInfo}
                                 refreshApp={refreshApp}
                />
            }
            case  "testing": {
                return <Testing application={application}
                                connection={connection}
                                setConnection={setConnection}
                                initConnection={initConnection}
                                refresh={refresh}
                                protocolOptions={protocolOptions}
                                arpInfo={arpInfo}
                                profileOptions={profileOptions}
                                identityProviders={identityProviders}
                                isProduction={false}
                />
            }
            case  "prod": {
                return <Testing application={application}
                                connection={connection}
                                setConnection={setConnection}
                                initConnection={initConnection}
                                refresh={refresh}
                                protocolOptions={protocolOptions}
                                arpInfo={arpInfo}
                                profileOptions={profileOptions}
                                identityProviders={prodIdentityProviders}
                                isProduction={true}
                />
            }
            case "application": {
                return <AppInformation application={application}
                                       setApplication={setApplication}
                                       refresh={refresh}
                                       changeTab={changeTab}
                                       privacyInfo={privacyInfo}
                                       protocolOptions={protocolOptions}
                                       profileOptions={profileOptions}
                                       arpInfo={arpInfo}
                />
            }
            case "contract": {
                return <Contract application={application}
                                 setApplication={setApplication}
                                 changeTab={changeTab}
                                 refresh={refresh}
                                 protocolOptions={protocolOptions}
                                 profileOptions={profileOptions}
                                 arpInfo={arpInfo}
                />
            }
            case "appteam": {
                return <AppTeamManagement application={application}
                                          refresh={refresh}
                                          refreshApp={refreshApp}
                />
            }
            default:
                throw new Error(`Unknown tab; ${currentTab}`)
        }
    }
    if (loading) {
        return <Loader/>
    }

    return (
        <div className="application-connection-container">
            <ApplicationConnectionHeader tabNames={tabNames}
                                         application={application}
                                         tab={currentTab}
                                         setLoading={setLoading}
                                         setTab={changeTab}/>
            {renderCurrentTab()}
        </div>
    )
}
