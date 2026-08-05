import "./ManageDetail.scss";
import "../styles/access_card.scss";
import React, {useEffect, useState} from "react";
import {
    allAplicationsByOrganisationLight,
    getConnectionByManageIdentifiers,
    importEntity,
    organizationsLight,
    publicServiceProviderByDetail
} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate, useParams} from "react-router";
import {Button, ButtonType, Loader} from "@surfnet/sds";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import {providerName, providerOrganizationName} from "../utils/Manage.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import DOMPurify from "dompurify";
import SelectField from "../components/SelectField.jsx";
import {useAppStore} from "../stores/AppStore.js";

const ManageDetail = () => {
    const setFlash = useAppStore(state => state.setFlash);

    const {manageType, manageId} = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [serviceProvider, setServiceProvider] = useState({});
    const [organization, setOrganization] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [application, setApplication] = useState(null);
    const [applications, setApplications] = useState([]);
    const [accessData, setAccessData] = useState({});
    const [confirmation, setConfirmation] = useState({});

    useEffect(() => {
        publicServiceProviderByDetail(manageType, manageId)
            .then(res => {
                setServiceProvider(res);
                //We can't combine the two calls, as getConnectionByManageIdentifiers might throw a 404
                getConnectionByManageIdentifiers(manageType, manageId)
                    .then(data => setAccessData(data))
                    .catch(() => true);
                setLoading(false);
                organizationsLight().then(orgs => setOrganizations(orgs));
            })
            .catch(() => {
                navigate("/404");
            });
    }, [manageType, manageId]);// eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <Loader/>
    }

    const importOrganisationChanged = option => {
        setOrganization(option);
        allAplicationsByOrganisationLight(option.value)
            .then(apps => {
                setApplications(apps);
                setApplication(null);
            })
    }

    const renderNoConnection = () => {
        return (
            <div className="manage-info">
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("manageDetail.notInAccess"))
                }}/>
                <div className="import">
                    <SelectField name={I18n.t("manageDetail.chooseOrganisation")}
                                 value={organization}
                                 options={organizations
                                     .map(org => ({value: org.id, label: org.name}))}
                                 searchable={true}
                                 placeholder={I18n.t("manageDetail.chooseImportOrganisationPlaceholder")}
                                 onChange={val => importOrganisationChanged(val)}
                    />
                    <SelectField name={I18n.t("manageDetail.chooseApplication")}
                                 value={application}
                                 disabled={isEmpty(organization)}
                                 options={applications
                                     .map(app => ({value: app.id, label: app.name}))}
                                 searchable={true}
                                 placeholder={I18n.t("manageDetail.chooseApplicationPlaceholder")}
                                 onChange={val => setApplication(val)}
                    />
                    <div className="options">
                        <Button onClick={() => doImport(true, false)}
                                type={ButtonType.Primary}
                                disabled={isEmpty(application)}
                                txt={I18n.t("manageDetail.importAsNewConnection")}/>
                        <Button onClick={() => doImport(true, true)}
                                type={ButtonType.Primary}
                                disabled={isEmpty(organization)}
                                txt={I18n.t("manageDetail.importAsNewApplication")}/>
                    </div>
                </div>
            </div>
        );
    }

    const doImport = (confirm, newApplication) => {
        if (confirm) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doImport(false, newApplication),
                title: I18n.t("manageDetail.import"),
                question: I18n.t(`manageDetail.${newApplication ? "impportApplicationConfirmation" : "impportConnectionConfirmation"}`, {
                    entity: providerName(I18n.locale, serviceProvider),
                    application: application?.label,
                    organisation: organization.label
                }),
                okButton: I18n.t("manageDetail.import")
            })
        } else {
            setLoading(true);
            setConfirmation({});
            importEntity(serviceProvider, organization.value, newApplication ? null : application.value)
                .then(() => {
                    setOrganization(null);
                    setApplication(null);
                    Promise.all([
                        getConnectionByManageIdentifiers(manageType, manageId),
                        publicServiceProviderByDetail(manageType, manageId)
                    ]).then(res => {
                        setAccessData(res[0])
                        setServiceProvider(res[1]);
                        setLoading(false);
                        setFlash(I18n.t("manageDetail.flash.migrated", {
                            entity: providerName(I18n.locale, serviceProvider),
                            organisation: organization.label
                        }));
                    })
                })
        }
    }

    const backToSystem = e => {
        stopEvent(e);
        navigate("/system/import");
    }

    const renderLogo = metaDataFields => {
        const logoUrl = metaDataFields["logo:0:url"];
        return isEmpty(logoUrl) ? <PlaceHolderImage/> : <img src={logoUrl} alt=""/>
    }

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
                        </div>
                        {isEmpty(accessData) && renderNoConnection()}
                        {!isEmpty(accessData) && renderConnection()}
                    </div>
                </div>
            </>
        );
    }

    const renderConnection = () => {
        return (
            <div className="manage-info">
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("manageDetail.inAccess", {
                        connection: accessData.connection.name,
                        application: accessData.application.name,
                        organisation: accessData.organisation.name
                    }))
                }}/>
            </div>
        );
    }
    const {open, cancel, action, question, title, okButton} = confirmation;

    return (
        <div className={`manage-detail-container`}>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
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