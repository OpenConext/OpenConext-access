import "./ApplicationDetail.scss";
import React, {useEffect, useState} from "react";
import {publicServiceProviderByDetail} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate, useParams} from "react-router-dom";
import {Button, ButtonIconPlacement, ButtonType, Loader} from "@surfnet/sds";
import StudentPng from "../icons/student2.png";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import ArrowLeftIcon from "@surfnet/sds/icons/functional-icons/arrow-left-2.svg";
import {APPLICATION_LINKS, providerDescription, providerName, providerOrganizationName} from "../utils/Manage.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";

const ApplicationDetail = () => {

        const navigate = useNavigate();
        const {manageType, manageId} = useParams();

        const [loading, setLoading] = useState(true);
        const [serviceProvider, setServiceProvider] = useState([]);
        const [showAttributes, setShowAttributes] = useState(false);
        const [showPrivacy, setShowPrivacy] = useState(false);

        useEffect(() => {
            publicServiceProviderByDetail(manageType, manageId)
                .then(res => {
                    setServiceProvider(res);
                    setLoading(false);
                })
                .catch(e => {
                    navigate("/404");
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps

        if (loading) {
            return <Loader/>
        }

        const externalLink = (link, metaData, index) => {
            const attribute = link.languageProperty ?
                (I18n.locale === "en" ? metaData[`${link.metaData}:en`] : metaData[`${link.metaData}:nl`] || metaData[`${link.metaData}:en`]) :
                metaData[link.metaData];
            if (isEmpty(attribute)) {
                return null;
            }
            if (link.localeAttribute) {
                let s = `${link.locale}.${attribute}`;
                console.log(s);
            }
            return (
                <a href={attribute} key={index} target="_blank" rel="noopener noreferrer">
                    {link.localeAttribute ? I18n.t(`${link.locale}.${attribute.replace(/\./g, '')}`) : I18n.t(link.locale)}
                </a>
            );
        }

        const metaData = serviceProvider.data.metaDataFields;

        const toggleShowAttributes = e => {
            stopEvent(e);
            setShowAttributes(true);
        }

        const toggleShowPrivacy = e => {
            stopEvent(e);
            setShowPrivacy(true);
        }

        return (
            <div className="application-detail-container">
                <div className="application-detail-header-container">
                    <div className="application-detail-header">
                        <div className="left">
                            <h1 className="large">{I18n.t("applicationDetail.title")}</h1>
                            <p>{I18n.t("applicationDetail.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="inner-application-detail-container">
                    <div className="application-detail">
                        <div className="meta-data">
                            {metaData["logo:0:url"] && <img src={metaData["logo:0:url"]} alt=""/>}
                            {!metaData["logo:0:url"] && <PlaceHolderImage/>}
                            <div className="meta-data-name">
                                <p className="organization">
                                    {providerOrganizationName(I18n.locale, serviceProvider)}
                                </p>
                                <p className="name">
                                    {providerName(I18n.locale, serviceProvider)}
                                </p>
                            </div>
                            <Button type={ButtonType.Secondary}
                                    icon={<ArrowLeftIcon/>}
                                    iconPlacement={ButtonIconPlacement.Left}
                                    onClick={() => navigate("/applications")}
                                    txt={I18n.t("applicationDetail.back")}/>
                        </div>
                        <div className="details">
                            <div className="left">
                                <p>{providerDescription(I18n.locale, serviceProvider)}</p>
                                <div className="details-panel">
                                    <p className="title">{I18n.t("applicationDetail.attributes")}</p>
                                    <p>{I18n.t("applicationDetail.attributesInfo")}</p>
                                    {!showAttributes && <a href="/" onClick={toggleShowAttributes}>
                                        {I18n.t("applicationDetail.details")}
                                    </a>}
                                </div>
                                <div className="details-panel">
                                    <p className="title">{I18n.t("applicationDetail.privacy")}</p>
                                    <p>{I18n.t("applicationDetail.privacyInfo")}</p>
                                    {!showAttributes && <a href="/" onClick={toggleShowPrivacy}>
                                        {I18n.t("applicationDetail.details")}
                                    </a>}
                                </div>
                            </div>
                            <div className="right">
                                <p className="license">{I18n.t(`applicationDetail.license.${metaData['coin:ss:license_status'] || 'license_not_required'}`)}</p>
                                <p className="info">{I18n.t("applicationDetail.quickLinks")}</p>
                                <div className="info-block">
                                    {APPLICATION_LINKS.map((link, index) =>
                                        externalLink(link, metaData, index)
                                    )}
                                </div>
                                <p className="info">{I18n.t("applicationDetail.contractual")}</p>
                                <p>
                                <span>
                                    {metaData["coin:contractual_base"] ?
                                        I18n.t(`applicationDetail.contractualBase.${metaData["coin:contractual_base"].toLowerCase()}`,
                                            {organisation: providerOrganizationName(I18n.locale, serviceProvider)})
                                        : I18n.t("applicationDetail.noInformation")}
                                </span>
                                    <span
                                        dangerouslySetInnerHTML={{__html: I18n.t("applicationDetail.wiki")}}/>
                                </p>
                                <p>{I18n.t("applicationDetail.contractualInfoOrganization",
                                    {name: providerOrganizationName(I18n.locale, serviceProvider)})}</p>
                                <p className="info">{I18n.t("applicationDetail.supportedEntityCategories")}</p>
                                <div className="info-block">
                                    {[1, 2, 3, 4].map(nbr =>
                                        externalLink({
                                            locale: "applicationDetail.entityCategory",
                                            localeAttribute: true,
                                            metaData: `coin:entity_categories:${nbr}`,
                                            languageProperty: false
                                        }, metaData, nbr)
                                    )}
                                    {[1, 2, 3, 4].every(nbr => isEmpty(metaData[`coin:entity_categories:${nbr}`])) &&
                                        <p>{I18n.t("applicationDetail.none")}</p>
                                    }
                                </div>
                                {metaData["mdrpi:RegistrationInfo"] && (
                                    <div className="federation-source">
                                        <p className="info">{I18n.t('applicationDetail.interfedSource')}</p>
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: I18n.t('applicationDetail.registrationInfo', {url: metaData["mdrpi:RegistrationInfo"]}),
                                            }}
                                        />
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
;
export default ApplicationDetail;