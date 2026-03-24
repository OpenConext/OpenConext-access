import "./ManageDetail.scss";
import "../styles/access_card.scss";
import React, {useEffect, useState} from "react";
import {getByManageIdentifiers, publicServiceProviderByDetail} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate, useParams} from "react-router-dom";
import {Button, Loader} from "@surfnet/sds";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import {providerName, providerOrganizationName} from "../utils/Manage.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

const ManageDetail = () => {

    const {manageType, manageId} = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [serviceProvider, setServiceProvider] = useState({});
    const [connection, setConnection] = useState({});
    const [section, setSection] = useState({});
    const [confirmation, setConfirmation] = useState({});

    useEffect(() => {
        publicServiceProviderByDetail(manageType, manageId)
            .then(res => {
                setServiceProvider(res);
                //We can't combine the two calls, as getByManageIdentifiers might throw a 404
                getByManageIdentifiers(manageType, manageId)
                    .then(conn => setConnection(conn))
                    .catch(() => true);
                setLoading(false);
            })
            .catch(() => {
                navigate("/404");
            });
    }, [manageType, manageId]);// eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <Loader/>
    }

    const renderCurrentSection = () => {
        switch (section) {
            case  "migrate": {
                return "Migrate";
            }
            case  "import": {
                return "Import";
            }
        }
        return <code>{JSON.stringify(connection)}</code>
    }

    const backToSystem = e => {
        stopEvent(e);
        navigate("/system/manage");
    }

    const renderLogo = metaDataFields => {
        const logoUrl = metaDataFields["logo:0:url"];
        return isEmpty(logoUrl) ? <PlaceHolderImage/> : <img src={logoUrl} alt=""/>
    }

    /**
     * TODO. There are two options:
     *
     * 1) Not present in Access database, choose organization, import as application or as connection under application X?
     * 2) Present in Access database, choose other organization, move the application of  the connection to different organization?
     *
     * First provide status in Chip, then based on 1/ or 2/, show the information needs to be filled in with dynamic components
     */

    const renderApp = () => {
        return (
            <>
                <div className="manage-detail-top">
                    <a href="/#" onClick={backToSystem}>{I18n.t("manageDetail.backToSystem")}</a>
                </div>
                <div className="inner-manage-detail-container">
                    <div className="manage-detail">
                        <div className="meta-data">
                            {renderLogo(serviceProvider.data.metaDataFields)}
                            <div className="meta-data-name">
                                <p className="organization">
                                    {providerOrganizationName(I18n.locale, serviceProvider)}
                                </p>
                                <p className="name">
                                    {providerName(I18n.locale, serviceProvider)}
                                </p>
                            </div>

                            <Button onClick={() => alert("todo")}
                                    txt={I18n.t("manageDetail.import")}/>
                        </div>
                        {renderCurrentSection()}
                    </div>
                </div>
            </>
        );
    }

    const {open, cancel, isError, action, question, title, okButton} = confirmation;

    return (
        <div className={`manage-detail-container`}>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         isError={isError}
                                         confirmationTxt={okButton}
                                         confirmationHeader={title}
                                         question={question}>
            </ConfirmationDialog>}
            <div className="inner-manage-detail-container">
                {renderApp()}
            </div>
        </div>
    );
}

export default ManageDetail;