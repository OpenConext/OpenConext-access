import "./ChangeRequests.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {getChangeRequests} from "../api/index.js";
import {Button, Loader} from "@surfnet/sds";
import {ENVIRONMENTS} from "../utils/Manage.js";

export const ChangeRequests = ({
                                   application
                               }) => {

    const {setFlash} = useAppStore(state => state);
    const [changeRequests, setChangeRequests] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const promises = application.connections
            .filter(connection => connection.environment === ENVIRONMENTS.PROD && connection.state === "prodaccepted")
            .map(connection => getChangeRequests(connection));
        Promise.all(promises)
            .then(res => {
                setChangeRequests(res);
                setLoading(false);
            })

    }, [application]);


    if (loading) {
        return <Loader/>
    }

    return (
        <div className="change-requests-container">
            <div className="change-requests-inner">
                <div className="app-header">
                    <h2>{I18n.t("changeRequests.title")}</h2>
                </div>
                <div className="change-requests-information card">
                    {JSON.stringify(changeRequests)}
                </div>
                <div className={`actions orphan`}>
                    {!application.signedContract &&
                        <>
                            <Button txt={I18n.t("connection.contractSection.sign")}
                                    disabled={!maySignContract}
                                    onClick={() => submit()}/>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}
