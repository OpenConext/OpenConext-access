import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Testing} from "../connection/Testing.jsx";
import {getApplicationById} from "../api/index.js";
import {convertServerConnectionToClient, generateOIDCClientID} from "../utils/Connection.js";
import {Loader} from "@surfnet/sds";

const tabNames = ["overview", "testing", "prod", "application", "contract"]

const protocolOptions = ["OIDC", "SAML"].map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol.toLowerCase()}`)
}));

export const Connection = () => {

    const {user, currentOrganization} = useAppStore(state => state);

    const {applicationId, id} = useParams();

    const [application, setApplication] = useState({});
    const [arpInfo, setArpInfo] = useState({});
    const [tab, setTab] = useState("overview");
    const [connection, setConnection] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getApplicationById(applicationId)])
            .then(res => {
                //For convenience editing
                res[0].connections = (res[0].connections || [])
                    .map(conn => convertServerConnectionToClient(conn, protocolOptions));
                setApplication(res[0]);
                setArpInfo(res[1]);
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
                    .map(conn => convertServerConnectionToClient(conn, protocolOptions));
                setApplication(res);
                setConnection(null);
            })
    }

    const initConnection = (forceNew = false) => {
        setConnection({
            new: forceNew,
            environment: "TEST",
            protocol: protocolOptions[0],
            grantTypes: ["authorization_code"],
            pkce: false,
            entityID: generateOIDCClientID(application),
            redirectUrls: [""],
            acsLocations: [""],
            metaData: {}
        });
        setTab("testing");
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
                                protocolOptions={protocolOptions}/>
            }
            case  "prod": {
                return <span>prod</span>
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
                                         setTab={setTab}/>
            {renderCurrentTab()}
        </div>
    )
}
