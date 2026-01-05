import "./ApplicationDetail.scss";
import React, {useEffect, useState} from "react";
import {connectServiceProviderToIdentityProvider, publicServiceProviderByDetail} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate, useParams} from "react-router-dom";
import {Button, ButtonIconPlacement, ButtonType, Loader, RadioOptions, RadioOptionsOrientation} from "@surfnet/sds";
import StudentPng from "../icons/student2.png";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import ArrowLeftIcon from "@surfnet/sds/icons/functional-icons/arrow-left-2.svg";
import {APPLICATION_LINKS, providerDescription, providerName, providerOrganizationName} from "../utils/Manage.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

const confirmationModalOptions = {
    makeConnection: "makeConnection",
    requestConnection: "requestConnection",
    disconnectConnection: "disconnectConnection",
    requestDisconnectConnection: "requestDisconnectConnection",
}

const ApplicationDetail = ({anonymous}) => {

        const {arp, privacy, user} = useAppStore(useShallow(state => ({
            arp: state.arp,
            privacy: state.privacy,
            user: state.user
        })));

        const navigate = useNavigate();
        const {manageType, manageId} = useParams();

        const [loading, setLoading] = useState(true);
        const [serviceProvider, setServiceProvider] = useState([]);
        const [showAttributes, setShowAttributes] = useState(false);
        const [showPrivacy, setShowPrivacy] = useState(false);
        const [metaData, setMetaData] = useState({});
        const [connectWithOutInteraction, setConnectWithOutInteraction] = useState(false);
        const [confirmation, setConfirmation] = useState({});
        const [accessChoice, setAccessChoice] = useState("ALL");
        const [confirmationModalOption, setConfirmationModalOption] = useState(null);


        useEffect(() => {
            publicServiceProviderByDetail(manageType, manageId)
                .then(res => {
                    setServiceProvider(res);
                    setLoading(false);
                    const newMetaData = res.data.metaDataFields;
                    setMetaData(newMetaData);
                    const connectOption = newMetaData["coin:dashboard_connect_option"] || "connect_with_interaction";
                    const sameInstitution = !isEmpty(newMetaData["coin:institution_guid"]) &&
                        newMetaData["coin:institution_guid"] === user.identityProvider.data.metaDataFields["coin:institution_guid"]
                    setConnectWithOutInteraction(connectOption !== "connect_with_interaction" || sameInstitution);
                })
                .catch(() => {
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

        const toggleShowAttributes = e => {
            stopEvent(e);
            setShowAttributes(true);
        }

        const toggleShowPrivacy = e => {
            stopEvent(e);
            setShowPrivacy(true);
        }

        const findArpEntry = urn => {
            return arp.attributes.find(attr => attr.urn === urn);
        }

        const confirmationModalChildren = () => {
            if (confirmationModalOption === confirmationModalOptions.makeConnection ) {
                return (
                    <div className="connect-options-container">
                        <RadioOptions name={"access"}
                                      label={I18n.t("applicationConnect.defaultAccess")}
                                      value={accessChoice}
                                      onChange={e => {
                                          const newValue = e.target.id.replace("access_", "").toUpperCase();
                                          setAccessChoice(newValue);
                                      }}
                                      isMultiple={true}
                                      labels={["ALL", "SOME"]}
                                      labelResolver={label => I18n.t(`applicationConnect.access.${label.toLowerCase()}`, {
                                          orgName: providerName(I18n.locale, user.identityProvider)
                                      })}
                                      orientation={RadioOptionsOrientation.column}/>
                    </div>
                );
            }
            return "TODO"
        }

        const doRequestConnection = withConfirmation => {
            if (withConfirmation) {
                setConfirmation({
                    open: true,
                    cancel: () => setConfirmation({open: false}),
                    action: () => doRequestConnection(false),
                    title: null,
                    question: null,
                    okButton: I18n.t("forms.proceed")
                });
                setConfirmationModalOption(confirmationModalOptions.makeConnection)
            } else {
                setConfirmation({});
                connectServiceProviderToIdentityProvider(serviceProvider.id,serviceProvider.type, user.identityProvider.id)
                    .then(() => {
                        //Where to go to next?
                        alert("done")
                    })
            }
        }

        const goBack = e => {
            stopEvent(e);
            navigate(-1);
        }

        const {open, cancel, action, question, title, okButton} = confirmation;

        return (
            <div className="application-detail-container">
                {open && <ConfirmationDialog confirm={action}
                                             cancel={cancel}
                                             confirmationTxt={okButton}
                                             confirmationHeader={title}
                                             question={question}>
                    {confirmationModalChildren()}
                </ConfirmationDialog>
                }
                {anonymous && <div className="application-detail-header-container">
                    <div className="application-detail-header">
                        <div className="left">
                            <h1 className="large">{I18n.t("applicationDetail.title")}</h1>
                            <p>{I18n.t("applicationDetail.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>}
                {!anonymous &&
                    <div className="application-detail-top">
                        <a href={"/"} onClick={goBack}>{I18n.t("applicationConnect.back")}</a>
                    </div>
                }
                <div className="inner-application-detail-container">
                    <div className={`application-detail ${anonymous ? "" : "stand-alone"}`}>
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
                            {anonymous && <Button type={ButtonType.Secondary}
                                                  icon={<ArrowLeftIcon/>}
                                                  iconPlacement={ButtonIconPlacement.Left}
                                                  onClick={goBack}
                                                  txt={I18n.t("applicationDetail.back")}/>}
                            {!anonymous && <Button onClick={() => doRequestConnection(true)}
                                                   txt={I18n.t(`applicationConnect.${connectWithOutInteraction ? "connect" : "request"}`)}/>}
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
                                    {showAttributes && <div className="arp-attributes">
                                        {!serviceProvider.data.arp.enabled &&
                                            <p>{I18n.t("applicationDetail.noArp")}</p>
                                        }
                                        {serviceProvider.data.arp.enabled &&
                                            <>
                                                {Object.entries(serviceProvider.data.arp.attributes).map((entry, index) => {
                                                    const attribute = findArpEntry(entry[0]);
                                                    //ARP entries only have one value / source
                                                    const value = entry[1][0];
                                                    const source = I18n.t(`applicationDetail.arpSources.${value.source}`);
                                                    return (
                                                        <div className="attribute" key={index}>
                                                            <span
                                                                className="attr-name">{attribute.friendlyNames[I18n.locale]}</span>
                                                            {!isEmpty(value.motivation) &&
                                                                <span className="attr-motivation">{value.motivation}</span>}
                                                            {isEmpty(value.motivation) && <span
                                                                className="attr-motivation">{I18n.t("applicationDetail.noMotivation")}</span>}
                                                            <span className="attr-source">
                                                         {`${entry[0]} - ${I18n.t("applicationDetail.source")} ${source}`}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        }
                                    </div>}
                                </div>
                                <div className="details-panel">
                                    <p className="title">{I18n.t("applicationDetail.privacy")}</p>
                                    <p>{I18n.t("applicationDetail.privacyInfo")}</p>
                                    {!showPrivacy && <a href="/" onClick={toggleShowPrivacy}>
                                        {I18n.t("applicationDetail.details")}
                                    </a>}
                                    {showPrivacy &&
                                        <div className="privacy-questions">
                                            {privacy.map((item, index) => {
                                                    const question = item[`info_${I18n.locale}`];
                                                    const strippedQuestion = question.substring(question.indexOf(" ") + 1);
                                                    const answer = metaData[item.manage]
                                                    return (
                                                        <div className="privacy-question" key={index}>
                                                            <span className="priv-name">{strippedQuestion}</span>
                                                            {isEmpty(answer) && <span
                                                                className="priv-answer">{I18n.t("applicationDetail.noPrivacyInfo")}</span>}
                                                            {!isEmpty(answer) && <span className="priv-answer">{answer}</span>}
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>}
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