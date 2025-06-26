import "./Contract.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {updateApplication} from "../api/index.js";
import {convertClientApplicationToServer, convertServerApplicationToClient} from "../utils/Application.js";
import {Button, Loader, ButtonType} from "@surfnet/sds";
import ContractSignedIcon from "../icons/undraw/contract_signed.svg";

export const Contract = ({
                             application,
                             setApplication,
                             changeTab,
                             refresh,
                             protocolOptions,
                             profileOptions,
                             arpInfo
                         }) => {

    const {setFlash} = useAppStore(state => state);
    const [loading, setLoading] = useState(false);

    const submit = () => {
        setLoading(true);
        const body = convertClientApplicationToServer(application);
        body.signedContract = true;
        updateApplication(body)
            .then(res => {
                setLoading(false);
                setFlash(I18n.t("application.flash", {name: res.name}));
                setApplication(convertServerApplicationToClient(res,protocolOptions, profileOptions, arpInfo));
            })
            .catch(() => {
                setLoading(false);
                setFlash(I18n.t("forms.error"), "error")
            });
    };

    const backToOverview = () => {
        refresh();
        changeTab("overview");
    }

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="contract-container">
            <div className="contract-inner">
                <div className="app-header">
                    <h2>{I18n.t("connection.contractSection.title")}</h2>
                </div>
                <div className="contract-information card">
                    <h4>{I18n.t("connection.contractSection.title")}</h4>
                    <p>{I18n.t("connection.contractSection.info")}</p>
                    <p>{I18n.t(`connection.contractSection.${application.signedContract ? "signed" : "notSigned"}`)}</p>
                    {application.signedContract &&
                        <div className="happy">
                            <ContractSignedIcon/>
                        </div>
                    }
                </div>
                <div className={`actions orphan`}>
                    {!application.signedContract &&
                        <>
                            <Button txt={I18n.t("connection.contractSection.sign")}
                                    onClick={() => submit()}/>
                        </>
                    }
                    {application.signedContract &&
                        <>
                            <Button txt={I18n.t("forms.backToOverview")}
                                    type={ButtonType.Secondary}
                                    onClick={() => backToOverview()}/>
                        </>
                    }
                </div>

            </div>
        </div>
    );
}
