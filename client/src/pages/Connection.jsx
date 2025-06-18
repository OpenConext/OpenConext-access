import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Testing} from "../connection/Testing.jsx";
import {arp, getApplicationById, getIdentityProviders} from "../api/index.js";
import {convertServerConnectionToClient, generateOIDCClientID} from "../utils/Connection.js";
import {Loader} from "@surfnet/sds";
import {PROTOCOLS} from "../utils/Manage.js";

const tabNames = ["overview", "testing", "prod", "application", "contract"]

const protocolOptions = Object.values(PROTOCOLS).map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol.toLowerCase()}`)
}));

export const Connection = () => {

    const {user, currentOrganization} = useAppStore(state => state);

    const {applicationId, id} = useParams();

    const [application, setApplication] = useState({});
    const [arpInfo, setArpInfo] = useState({profiles: [], attributes: []});
    const [profileOptions, setProfileOptions] = useState([]);
    const [tab, setTab] = useState("overview");
    const [connection, setConnection] = useState(null);
    const [identityProviders, setIdentityProviders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getApplicationById(applicationId), arp(), getIdentityProviders("TEST")])
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
                setApplication(res[0]);
                setArpInfo(res[1]);
                setIdentityProviders(res[2]);
                setProfileOptions(options)
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
    }, [id]);

    const refresh = () => {
        getApplicationById(applicationId)
            .then(res => {
                res.connections = (res.connections || [])
                    .map(conn => convertServerConnectionToClient(conn, protocolOptions, profileOptions, arpInfo));
                setApplication(res);
                setConnection(null);
            })
    }

    const initConnection = (forceNew = false) => {
        const iDps = I18n.translations[I18n.locale].connection.testIdPs.identityProviders;
        setConnection({
            new: forceNew,
            environment: "TEST",
            protocol: protocolOptions[0],
            grantTypes: ["authorization_code"],
            pkce: false,
            entityID: generateOIDCClientID(application),
            redirectUrls: [""],
            acsLocations: null,
            metaData: {},
            motivations: {},
            additionalAttributes: [],
            profile: application.type === "APP" ? profileOptions[0] : profileOptions[1],
            profileMotivation: "",
            allowedEntities: iDps.map(idp => idp.entityid)
        });
        setTab("testing");
    }

    const changeTab = newTab => {
        if (tab === "testing") {
            //force the overview
            setConnection(null);
        }
        setTab(newTab);
    }

    const renderCurrentTab = () => {
        switch (tab) {
            case "overview": {
                return <Overview application={application}
                                 user={user}
                                 initConnection={initConnection}
                                 setTab={setTab}/>
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
                                identityProviders={identityProviders}
                                isProduction={false}
                />
            }
            case "application": {
                return <span>application</span>
            }
            case "contract": {
                return <span>contract</span>
            }
            default:
                throw new Error(`Unknown tab; ${tab}`)
        }
    }
    if (loading) {
        return <Loader/>
    }

    return (
        <div className="application-connection-container">
            <ApplicationConnectionHeader tabNames={tabNames}
                                         application={application}
                                         tab={tab}
                                         setLoading={setLoading}
                                         setTab={changeTab}/>
            {renderCurrentTab()}
        </div>
    )
}
