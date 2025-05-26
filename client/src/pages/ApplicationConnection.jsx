import "./ApplicationConnection.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {ApplicationConnectionHeader} from "../components/ApplicationConnectionHeader.jsx";
import {Overview} from "../connection/Overview.jsx";
import {Testing} from "../connection/Testing.jsx";
import {organizationById} from "../api/index.js";

const tabNames = ["overview", "testing", "prod", "application", "contract"]

const protocolOptions = ["oidc10rp", "saml20sp"].map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol}`)
}));

export const ApplicationConnection = () => {

    const {user} = useAppStore(state => state);

    const {organisationId, applicationId, id} = useParams();

    const [application, setApplication] = useState({});
    const {isNew, setIsNew} = useState(true);
    const [tab, setTab] = useState("overview");
    const [connection, setConnection] = useState({
        environment: "test",
        protocol: protocolOptions[0],
        grantTypes: ["authorization_code"],
        pkce: true,
        redirectUrls: [""],
        acsLocations: [""],
        metaData: {}
    });

    useEffect(() => {
        organizationById(id).then(res => {
            //TODO not necessary ,
        })
        const newApplication = {
            id: 6,
            name: "BuddyCheck",
            connections: [{name: "BuddyCheck-TEST"}, {name: "BuddyCheck-PROD"}]
        };
        setApplication(newApplication)
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {path: `/organization/${organisationId}`, value: "TODO Org Name"},
                {path: `/application/${applicationId}`, value: I18n.t("breadCrumb.applications")},
                {value: newApplication.name}
            ]
        });
    }, [id]);

    const renderCurrentTab = () => {
        switch (tab) {
            case "overview": {
                return <Overview application={application}
                                 user={user}
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
