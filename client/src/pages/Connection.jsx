import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Testing} from "../connection/Testing.jsx";
import {arp, getApplicationById, getIdentityProviders, privacy} from "../api/index.js";
import {convertServerConnectionToClient} from "../utils/Connection.js";
import {Loader} from "@surfnet/sds";
import {ENVIRONMENTS, PROTOCOLS, STATUSES} from "../utils/Manage.js";
import {AppInformation} from "../connection/AppInformation.jsx";
import {convertServerApplicationToClient} from "../utils/Application.js";

const tabNames = ["overview", "testing", "prod", "application", "contract"]

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

    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            getApplicationById(applicationId),
            arp(),
            privacy(),
            getIdentityProviders(ENVIRONMENTS.TEST),
            getIdentityProviders(ENVIRONMENTS.PROD)])
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
                res[0].connections = (res[0].connections || [])
                    .map(conn => convertServerConnectionToClient(conn, protocolOptions, options, res[1]));
                setApplication(convertServerApplicationToClient(res[0]));
                setArpInfo(res[1]);
                setPrivacyInfo(res[2])
                setIdentityProviders(res[3]);
                setProdIdentityProviders(res[4]);
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
            })
    }, []);

    const refresh = () => {
        getApplicationById(applicationId)
            .then(res => {
                res.connections = (res.connections || [])
                    .map(conn => convertServerConnectionToClient(conn, protocolOptions, profileOptions, arpInfo));
                setApplication(convertServerApplicationToClient(res));
                setConnection(null);
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
            status: STATUSES.OPEN,
            motivations: {},
            additionalAttributes: [],
            profile: application.type === "APP" ? profileOptions[0] : profileOptions[1],
            profileMotivation: "",
            allowedEntities: iDps.map(idp => idp.entityid)
        });
        changeTab(environment === ENVIRONMENTS.TEST ? "testing" : "prod");
    }

    const changeTab = newTab => {
        if (currentTab === "testing") {
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
                                       privacyInfo={privacyInfo}
                />
            }
            case "contract": {
                return <span>contract</span>
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
