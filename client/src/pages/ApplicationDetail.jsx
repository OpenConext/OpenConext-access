import "./ApplicationDetail.scss";
import React, {useEffect, useState} from "react";
import {
    connectServiceProviderToIdentityProvider,
    getPolicyByServiceProviderEntityId,
    inviteRoles,
    publicServiceProviderByDetail
} from "../api/index.js";
import I18n from "../locale/I18n.js";
import ExternalLinkIcon from "../icons/external-link.svg";
import NotAllowedIcon from "../icons/not-allowed.svg";
import {useNavigate, useParams} from "react-router-dom";
import {
    Alert,
    AlertType,
    Button,
    ButtonIconPlacement,
    ButtonType,
    Chip,
    ChipType,
    Loader,
    RadioOptions,
    RadioOptionsOrientation
} from "@surfnet/sds";
import StudentPng from "../icons/student2.png";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import ArrowLeftIcon from "@surfnet/sds/icons/functional-icons/arrow-left-2.svg";
import {
    APPLICATION_LINKS,
    isAccessRoleReady,
    providerDescription,
    providerName,
    providerOrganizationName
} from "../utils/Manage.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {authorities, deriveAccess, isAdmin} from "../utils/Permissions.js";
import InputField from "../components/InputField.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {TabHeader} from "../components/TabHeader.jsx";
import {InfoBlock} from "../components/InfoBlock.jsx";
import DOMPurify from "dompurify";
import {PolicyOverview} from "../policies/PolicyOverview.jsx";
import {PolicyForm} from "../policies/PolicyForm.jsx";
import {groupByValues, policyTemplate} from "../utils/Policy.js";

const confirmationModalOptions = {
    makeConnection: "makeConnection",
    requestConnection: "requestConnection",
    requestConnectionByMember: "requestConnectionByMember",
    disconnectConnection: "disconnectConnection",
    requestDisconnectConnection: "requestDisconnectConnection",
}

const ApplicationDetail = ({anonymous, refreshUser}) => {

    const {arp, privacy, user, config, setFlash, currentOrganization} = useAppStore(useShallow(state => ({
        arp: state.arp,
        privacy: state.privacy,
        user: state.user,
        config: state.config,
        setFlash: state.setFlash,
        currentOrganization: state.currentOrganization
    })));

    const navigate = useNavigate();
    const {manageType, manageId, tab = "access", page, policyId} = useParams();

    const [tabNames, setTabNames] = useState(["access", "information"]);
    const [currentTab, setCurrentTab] = useState(tab);
    const [loading, setLoading] = useState(true);
    const [serviceProvider, setServiceProvider] = useState({});
    const [accessRoles, setAccessRoles] = useState({});
    const [policies, setPolicies] = useState([]);
    const [showAttributes, setShowAttributes] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [metaData, setMetaData] = useState({});
    const [connectWithoutInteraction, setConnectWithoutInteraction] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [accessChoice, setAccessChoice] = useState("ALL");
    const [confirmationModalOption, setConfirmationModalOption] = useState(null);
    const [message, setMessage] = useState("");
    const [memberRequestSend, setMemberRequestSend] = useState(false);
    const [accessible, setAccessible] = useState(false);
    const [readOnly, setReadOnly] = useState(true);
    const [showPolicyOverview, setShowPolicyOverview] = useState(false);
    const [showPolicyDetails, setShowPolicyDetails] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState(null);

    const toPolicyDetail = (policyIdentifier, allPolicies = policies) => {
        setShowPolicyOverview(false);
        let newCurrentPolicy;
        if (policyIdentifier === "new") {
            newCurrentPolicy = policyTemplate(user.identityProvider.data.entityid, serviceProvider.data.entityid);
        } else {
            newCurrentPolicy = allPolicies.find(policy => policy.id === policyIdentifier);
            if (isEmpty(newCurrentPolicy)) {
                navigate("/404");
                return;
            }
            newCurrentPolicy.data.attributes = groupByValues([...newCurrentPolicy.data.attributes]);
        }
        setCurrentPolicy(newCurrentPolicy);
        setShowPolicyDetails(true);
        navigate(`/application-detail/${manageType}/${manageId}/details/${policyIdentifier}`);
    }

    useEffect(() => {
        publicServiceProviderByDetail(manageType, manageId)
            .then(res => {
                setServiceProvider(res);
                const newMetaData = res.data.metaDataFields;
                setMetaData(newMetaData);
                if (anonymous) {
                    setLoading(false);
                    return;
                }
                //See if this application is already connected
                const {isAccessible, isReadOnly} = deriveAccess(user, res.data.entityid);
                const adminUser = isAdmin(user, authorities);
                setAccessible(isAccessible);
                setIsAdminUser(adminUser);
                setReadOnly(isReadOnly);
                //Update breadcrumb
                useAppStore.setState({
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                        {
                            path: isAccessible ? "/accessible-apps" : "/catalogue",
                            value: I18n.t(`navigation.${isAccessible ? "accessibleApps" : "catalogue"}`)
                        },
                        {value: providerName(I18n.locale, res)}
                    ],
                    activeMenuItem: isAccessible ? mainMenuItems.accessibleApps : mainMenuItems.catalogue
                });
                const connectOption = newMetaData["coin:dashboard_connect_option"] || "connect_with_interaction";
                const sameInstitution = !isEmpty(newMetaData["coin:institution_guid"]) &&
                    newMetaData["coin:institution_guid"] === user.identityProvider.data.metaDataFields["coin:institution_guid"]
                setConnectWithoutInteraction(connectOption !== "connect_with_interaction" || sameInstitution);
                if (isAccessible) {
                    if (adminUser) {
                        if (isReadOnly) {
                            setLoading(false);
                        } else {
                            Promise.all([
                                getPolicyByServiceProviderEntityId(res.data.entityid),
                                inviteRoles(user.organizationGUID, res.id)])
                                .then(res => {
                                    res[0].forEach(policy => policy.originalName = policy.name);
                                    setPolicies(res[0]);
                                    setAccessRoles(res[1]);
                                    if (page === "overview") {
                                        setShowPolicyOverview(true);
                                    }
                                    if (page === "details" && !isEmpty(policyId)) {
                                        toPolicyDetail(policyId, res[0]);
                                    }
                                    setLoading(false);
                                })
                        }
                    } else {
                        setTabNames(["information"]);
                        setCurrentTab("information");
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            })
            .catch(() => {
                navigate("/404");
            });
    }, [user]);// eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <Loader/>
    }

    const refreshPolicies = () => {
        setLoading(true);
        getPolicyByServiceProviderEntityId(serviceProvider.data.entityid)
            .then(res => {
                setPolicies(res);
                setShowPolicyOverview(true);
                setShowPolicyDetails(false);
                setLoading(false);
                navigate(`/application-detail/${manageType}/${manageId}/overview`);
            })
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
        if (confirmationModalOption === confirmationModalOptions.makeConnection) {
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
        } else if (confirmationModalOption === confirmationModalOptions.requestConnectionByMember) {
            return (
                <div className="connect-options-container">
                    <h3>{I18n.t("applicationConnect.requestMember")}</h3>
                    <p dangerouslySetInnerHTML={{
                        __html: I18n.t("applicationConnect.memberRequestInfo.info",
                            {orgName: currentOrganization.name})
                    }}/>
                    <p dangerouslySetInnerHTML={{__html: I18n.t("applicationConnect.memberRequestInfo.subInfo")}}/>
                    <InputField multiline={true}
                                displayLabel={false}
                                value={message}
                                placeholder={I18n.t("applicationConnect.messagePlaceholder")}
                                onChange={e => setMessage(e.target.value)}
                    />
                </div>
            );

        } else if (confirmationModalOption === confirmationModalOptions.requestConnection) {
            return (
                <div className="connect-options-container">
                    <h3>{I18n.t("applicationConnect.requestConnection")}</h3>
                    <p>{I18n.t("applicationConnect.requestConnectionInfo")}</p>
                </div>
            );

        }
        return null;
    }

    const cancelConfirmation = () => {
        setConfirmation({});
        setMessage("");
        setAccessChoice("ALL")
    }

    const cancelConnectionRequest = (withConfirmation, e) => {
        stopEvent(e);
        setConfirmationModalOption(null);
        if (withConfirmation) {
            setConfirmation({
                open: true,
                cancel: () => cancelConfirmation(),
                action: () => cancelConnectionRequest(false),
                title: I18n.t("appAccess.cancelRequestTitle"),
                okButton: I18n.t("forms.sure"),
                question: I18n.t("appAccess.cancelRequestQuestion"),
            });
        } else {
            cancelConfirmation();
            alert("cancel request")
        }
    }

    const doRequestConnection = (withConfirmation, modalOption) => {
        if (withConfirmation) {
            let newModalOption;
            if (!isAdminUser) {
                newModalOption = confirmationModalOptions.requestConnectionByMember;
            } else if (connectWithoutInteraction) {
                newModalOption = confirmationModalOptions.makeConnection;
            } else {
                newModalOption = confirmationModalOptions.requestConnection;
            }
            setConfirmationModalOption(newModalOption);
            setConfirmation({
                open: true,
                cancel: () => cancelConfirmation(),
                action: () => doRequestConnection(false, newModalOption),
                title: null,
                question: null,
                okButton: I18n.t(!isAdminUser ? "applicationConnect.sendMessage" : "forms.proceed")
            });
        } else {
            cancelConfirmation();
            setLoading(true);
            const manageIdentifierOrg = user.identityProvider?.id || currentOrganization.manageIdentifier;
            connectServiceProviderToIdentityProvider(
                serviceProvider.id,
                serviceProvider.type,
                manageIdentifierOrg,
                message)
                .then(() => {
                    if (confirmationModalOption === confirmationModalOptions.requestConnectionByMember) {
                        setFlash(I18n.t("applicationConnect.flash.requestConnectionByMember"));
                        setMemberRequestSend(true);
                    } else {
                        setFlash(I18n.t(`applicationConnect.flash.${modalOption}`));
                        //Because user is an useEffect dependency, everything will reload. Including change requests
                        refreshUser(() => {
                            //a small timeout to prevent flickering - connecting apps does not happen that often
                            setTimeout(() => setLoading(false), 75);
                        });

                    }
                })
        }
    }

    const goBack = e => {
        stopEvent(e)
        navigate(`/application-detail/${manageType}/${manageId}`);
        setShowPolicyOverview(false);
    }

    const goBackToApplications = () => {
        navigate(-1);
    }

    const {open, cancel, action, question, title, okButton} = confirmation;

    const renderCurrentTab = () => {
        switch (currentTab) {
            case  "access": {
                return renderAccessApp();
            }
            case  "information": {
                return renderInformation();
            }
            default:
                throw new Error(`Unknown tab; ${currentTab}`)
        }
    }

    const tabChanged = name => {
        setCurrentTab(name);
    }

    const backToAccess = (e, pageName) => {
        stopEvent(e);
        const toOverview = pageName === "/overview";
        setShowPolicyOverview(toOverview);
        setShowPolicyDetails(false);
        navigate(`/application-detail/${manageType}/${manageId}${pageName}`);
    }

    const renderAccessApp = () => {
        return (
            <>
                {readOnly && <Alert alertType={AlertType.Warning}
                                    asChild={true}
                                    children={<a href="/" onClick={e => cancelConnectionRequest(true, e)}>
                                        {I18n.t("appAccess.cancelRequest")}</a>}
                                    message={I18n.t("appAccess.requestedAccessNotification")}/>
                }
                <div className={`app-access ${readOnly ? "read-only" : ""}`} onClick={e => readOnly && stopEvent(e)}>
                    {showPolicyDetails &&
                        <PolicyForm policy={currentPolicy}
                                    setPolicy={setCurrentPolicy}
                                    isExistingPolicy={!isEmpty(currentPolicy.id)}
                                    originalName={currentPolicy.originalName}
                                    refreshPolicies={refreshPolicies}
                        />
                    }
                    {showPolicyOverview &&
                        <PolicyOverview
                            serviceProvider={serviceProvider}
                            policies={policies}
                            backToAccess={e => backToAccess(e, "")}
                            policyDetails={toPolicyDetail}
                            refreshPolicies={refreshPolicies}
                        />
                    }
                    {(!showPolicyOverview && !showPolicyDetails) && <>
                        <div className="app-access-central">
                            <h2>{I18n.t("appAccess.title")}</h2>
                            <InfoBlock className="no-gap">
                                <div className="grouped">
                                    <div>
                                        <h3>{I18n.t("appAccess.users", {name: providerOrganizationName(I18n.locale, serviceProvider)})}</h3>
                                        <p>{I18n.t("appAccess.config")}</p>
                                    </div>
                                    <Button type={ButtonType.Primary}
                                            onClick={() => {
                                                setShowPolicyOverview(true);
                                                navigate(`/application-detail/${manageType}/${manageId}/overview`);
                                            }}
                                            txt={I18n.t("forms.edit")}/>
                                </div>
                                <p>{I18n.t("appAccess.accessFor")}</p>
                                <div className="access-card large">
                                    <h4>{I18n.t(`appAccess.${isEmpty(policies) ? "everyBody" : "notEveryBody"}`,
                                        {name: providerOrganizationName(I18n.locale, serviceProvider)})}</h4>
                                    {renderLogo(user.identityProvider.data.metaDataFields)}
                                </div>
                                <p>{I18n.t(`appAccess.${isEmpty(policies) ? "noAccessFor" : "accessFor"}`)}</p>
                                {isEmpty(policies) && <>
                                    <div className="access-card grey">
                                        {I18n.t("appAccess.noOneGroups")}
                                    </div>
                                </>}
                                {!isEmpty(policies) && <>
                                    {policies.map((policy, index) =>
                                        <div key={index} className="access-card large">
                                            {policy.data.name}

                                        </div>)}

                                </>}
                            </InfoBlock>
                            <InfoBlock className="no-gap">
                                <div className="grouped">
                                    <div>
                                        <h3>{I18n.t("appAccess.outSideUsers")}</h3>
                                        <p>{I18n.t("appAccess.roleBasedAccess")}</p>
                                    </div>
                                    <Button type={ButtonType.Primary}
                                            onClick={() => window.open(`${config.invite}/applications/${serviceProvider.id}`,
                                                "_blank").focus()}
                                            icon={<ExternalLinkIcon/>}
                                            txt={I18n.t("appAccess.roleManagement")}/>
                                </div>
                                {isEmpty(accessRoles) &&
                                    <div className="access-card grey">
                                        <p>{I18n.t("appAccess.noRoles")}</p>
                                    </div>}
                                {!isEmpty(accessRoles) &&
                                    <>
                                        <p>{I18n.t("appAccess.accessFor")}</p>
                                        {accessRoles.map((role, index) =>
                                            <div key={index} className="access-card column large">
                                                <div>
                                                    <p dangerouslySetInnerHTML={{
                                                        __html: DOMPurify.sanitize(
                                                            I18n.t("appAccess.roleUsers", {count: role.userRoleCount}))
                                                    }}/>
                                                    <p><strong>{role.name}</strong></p>
                                                </div>
                                                <div className={`chip ${role.eduIDOnly ? "blue" : ""}`}>
                                                    {I18n.t(`appAccess.${role.eduIDOnly ? "eduIDOnly" : "everyIdp"}`)}
                                                </div>


                                            </div>)}
                                    </>
                                }
                                <em className="role-ready" dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                        I18n.t(`appAccess.${isAccessRoleReady(serviceProvider) ? "roleReady" : "notRoleReady"}`))
                                }}/>
                            </InfoBlock>
                        </div>
                        <div className="app-access-decentral">
                            <h2>{I18n.t("appAccess.decentralAccess")}</h2>
                            <InfoBlock className="no-gap grey row">
                                <div className="not-allowed-container">
                                    <NotAllowedIcon/>
                                    <p
                                        dangerouslySetInnerHTML={{__html: I18n.t("appAccess.noDecentralAccess")}}/>
                                </div>
                            </InfoBlock>
                        </div>
                    </>}
                </div>
            </>
        );
    }

    const renderInformation = () => {
        return renderDetailsApp();
    }

    const renderAccessibleApp = () => {
        return (
            <>
                <div className="application-detail-header-container">
                    <TabHeader tab={currentTab}
                               setTab={tabChanged}
                               tabNames={tabNames}
                    >
                        <div className="application-card-container">
                            <div className="application-card">
                                {metaData["logo:0:url"] && <img src={metaData["logo:0:url"]} alt=""/>}
                                {!metaData["logo:0:url"] && <PlaceHolderImage/>}
                                <div className="provider-details">
                                    <h3>{providerName(I18n.locale, serviceProvider)}</h3>
                                    <p>{providerDescription(I18n.locale, serviceProvider)}</p>
                                </div>
                            </div>
                            <Chip type={readOnly ? ChipType.Status_error : ChipType.Status_info}
                                  label={I18n.t(`accessibleApps.${readOnly ? "connectRequested" : "connectionMade"}`)}/>
                        </div>
                    </TabHeader>
                </div>
                <div className="application-detail-page">
                    {renderCurrentTab()}
                </div>
            </>
        )
    }

    const renderAppAttributes = () => {
        return (
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
                                            <span
                                                className="attr-motivation">{value.motivation}</span>}
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
        );
    }

    function renderAppPrivacy() {
        return <div className="details-panel">
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
                                    {!isEmpty(answer) &&
                                        <span className="priv-answer">{answer}</span>}
                                </div>
                            );
                        }
                    )}
                </div>}
        </div>;
    }

    const renderQuickLinks = () => {
        return (
            <>
                <p className="info">{I18n.t("applicationDetail.quickLinks")}</p>
                <div className="app-info-block">
                    {APPLICATION_LINKS.map((link, index) =>
                        externalLink(link, metaData, index)
                    )}
                </div>
            </>
        );
    }

    const renderLogo = metaDataFields => {
        const logoUrl = metaDataFields["logo:0:url"];
        return isEmpty(logoUrl) ? <PlaceHolderImage/> : <img src={logoUrl} alt=""/>
    }

    const renderDetailsApp = () => {
        return (
            <div className={`details ${anonymous ? "anonymous" : ""}`}>
                <div className="left">
                    <p>{providerDescription(I18n.locale, serviceProvider)}</p>
                    {renderAppAttributes()}
                    {renderAppPrivacy()}
                </div>
                <div className="right">
                    <p className="license">{I18n.t(`applicationDetail.license.${metaData['coin:ss:license_status'] || 'license_not_required'}`)}</p>
                    {renderQuickLinks()}
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
                    <div className="app-info-block">
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
        );
    }

    const renderNonAccessibleApp = () => {
        return (
            <>
                {anonymous &&
                    <div className="application-detail-header-container">
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
                        <a onClick={goBack}>{I18n.t("applicationConnect.back")}</a>
                    </div>
                }
                <div className="inner-application-detail-container">
                    <div className={`application-detail ${anonymous ? "" : "stand-alone"}`}>
                        <div className="meta-data">
                            {renderLogo(metaData)}
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
                                                  onClick={goBackToApplications}
                                                  txt={I18n.t("applicationDetail.back")}/>}
                            {!anonymous && <Button onClick={() => doRequestConnection(true)}
                                                   disabled={memberRequestSend}
                                                   txt={I18n.t(`applicationConnect.${!isAdminUser ? "requestMember" :
                                                       connectWithoutInteraction ? "connect" : "request"}`)}/>}
                        </div>
                        {renderDetailsApp()}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className={`application-detail-container`}>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationTxt={okButton}
                                         confirmationHeader={title}
                                         question={question}>
                {confirmationModalChildren()}
            </ConfirmationDialog>}
            {accessible && renderAccessibleApp()}
            {!accessible && renderNonAccessibleApp()}
        </div>
    );
}

export default ApplicationDetail;