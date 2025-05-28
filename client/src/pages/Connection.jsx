import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Testing} from "../connection/Testing.jsx";
import {getApplicationById} from "../api/index.js";

const tabNames = ["overview", "testing", "prod", "application", "contract"]

const protocolOptions = ["oidc10rp", "saml20sp"].map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol}`)
}));

export const Connection = () => {

    const {user, currentOrganization} = useAppStore(state => state);

    const {applicationId, id} = useParams();

    const [application, setApplication] = useState({});
    const [tab, setTab] = useState("overview");
    const [connection, setConnection] = useState(null);

    useEffect(() => {
        getApplicationById(applicationId)
            .then(res => {
                setApplication(res);
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

    const initConnection = () => {
        setConnection({
            environment: "test",
            protocol: protocolOptions[0],
            grantTypes: ["authorization_code"],
            pkce: true,
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
