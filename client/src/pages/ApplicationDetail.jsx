import "./ApplicationDetail.scss";
import "../styles/access_card.scss";
import React, {useEffect, useState} from "react";
import {
    cancelServiceProviderConnectionRequest,
    cancelServiceProviderDisconnectionRequest,
    connectServiceProviderToIdentityProvider,
    disconnectServiceProviderToIdentityProvider,
    getPolicyByServiceProviderEntityId,
    inviteRoles,
    publicServiceProviderByDetail,
    saveIdentityProviderAssurance,
    saveIdentityProviderConsent
} from "../api/index.js";
import I18n from "../locale/I18n.js";
import ExternalLinkIcon from "../icons/external-link.svg";
import NotAllowedIcon from "../icons/not-allowed.svg";
import {useNavigate, useParams} from "react-router-dom";
import {Alert, AlertType, Button, ButtonIconPlacement, ButtonType, Chip, ChipType, Loader} from "@surfnet/sds";
import StudentPng from "../icons/student2.png";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import ArrowLeftIcon from "@surfnet/sds/icons/functional-icons/arrow-left-2.svg";
import AlertIcon from "../icons/alert-triangle.svg";

import ExampleSVG from "../icons/wayf.svg";
import {
    APPLICATION_LINKS,
    connectWithoutInteraction,
    CONSENT,
    isAccessRoleReady,
    MFA_LEVELS,
    providerDescription,
    providerName,
    providerOrganizationName,
    STEPUP_LEVELS
} from "../utils/Manage.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {authorities, deriveAccess, isAdmin} from "../utils/Permissions.js";
import InputField from "../components/InputField.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {TabHeader} from "../components/TabHeader.jsx";
import {InfoBlock} from "../components/InfoBlock.jsx";
import DOMPurify from "dompurify";
import SelectField from "../components/SelectField.jsx";

const confirmationModalOptions = {
    makeConnection: "makeConnection",
    requestConnection: "requestConnection",
    requestConnectionByMember: "requestConnectionByMember",
    cancelConnection: "cancelConnection",
    requestDisconnectConnection: "requestDisconnectConnection",
}

const tabs = {
    access: "access",
    information: "information",
    consent: "consent",
    assurance: "assurance"
}

const consentOptions = Object.keys(CONSENT).map(k => ({label: I18n.t(`consent.${k}`), value: k}));

const mfaOptions = Object.keys(MFA_LEVELS).map(k => ({label: I18n.t(`assurance.mfa.${k}`), value: MFA_LEVELS[k]}));
const stepupOptions = Object.keys(STEPUP_LEVELS).map(k => ({
    label: I18n.t(`assurance.stepup.${k}`),
    value: STEPUP_LEVELS[k]
}));

const MFA_DEFAULT = MFA_LEVELS.multipleauthn;
const STEPUP_DEFAULT = STEPUP_LEVELS.loa1_5;

const mfaLoaInteger = level => {
    if ([MFA_LEVELS.password, MFA_LEVELS.transparentAuthnContext].includes(level)) {
        return 1;
    }
    return 2;
};

const stepupLoaInteger = level => {
    if (level === STEPUP_LEVELS.loa2) {
        return 2;
    }
    if (level === STEPUP_LEVELS.loa3) {
        return 3;
    }
    return 1; // loa1_5
};

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
    const {manageType, manageId, tab = tabs.access} = useParams();

    const [tabNames, setTabNames] = useState(Object.values(tabs));
    const [currentTab, setCurrentTab] = useState(tab);
    const [loading, setLoading] = useState(true);
    const [serviceProvider, setServiceProvider] = useState({});
    const [accessRoles, setAccessRoles] = useState({});
    const [policies, setPolicies] = useState([]);
    const [showAttributes, setShowAttributes] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [metaData, setMetaData] = useState({});
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [confirmationModalOption, setConfirmationModalOption] = useState(null);
    const [message, setMessage] = useState("");
    const [consent, setConsent] = useState({type: CONSENT.default_consent});
    const [mfaEntity, setMfaEntity] = useState({level: MFA_DEFAULT});
    const [stepupEntity, setStepupEntity] = useState({level: STEPUP_DEFAULT});
    const [memberRequestSend, setMemberRequestSend] = useState(false);
    const [accessible, setAccessible] = useState(false);
    const [readOnly, setReadOnly] = useState(true);
    const [pendingDisconnect, setPendingDisconnect] = useState(true);
    const [changeRequestTicketKey, setChangeRequestTicketKey] = useState(null);

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
                const entityId = res.data.entityid;
                //See if this application is already connected
                const {
                    isAccessible,
                    isReadOnly,
                    isPendingDisconnect,
                    ticketKey
                } = deriveAccess(currentOrganization, entityId);
                const adminUser = isAdmin(user, currentOrganization, authorities);
                setAccessible(isAccessible);
                setIsAdminUser(adminUser);
                setReadOnly(isReadOnly);
                setChangeRequestTicketKey(ticketKey);
                setPendingDisconnect(isPendingDisconnect);
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
                if (isAccessible) {
                    if (adminUser) {
                        if (isReadOnly) {
                            setTabNames([tabs.access, tabs.information]);
                            setLoading(false);
                        } else {
                            Promise.all([
                                getPolicyByServiceProviderEntityId(entityId, currentOrganization.id),
                                inviteRoles(user.organizationGUID, res.id)])
                                .then(res => {
                                    res[0].forEach(policy => policy.originalName = policy.name);
                                    setPolicies(res[0]);
                                    setAccessRoles(res[1]);
                                    setLoading(false);
                                    const currentConsent = (currentOrganization.identityProvider.data.disableConsent || [])
                                        .find(entry => entry.name === entityId);
                                    setConsent(isEmpty(currentConsent) ? {
                                        name: entityId,
                                        type: CONSENT.default_consent,
                                        "explanation:nl": "",
                                        "explanation:en": ""
                                    } : currentConsent)
                                    const currentMfa = (currentOrganization.identityProvider.data.mfaEntities || [])
                                        .find(entry => entry.name === entityId);
                                    setMfaEntity(isEmpty(currentMfa)
                                        ? {name: entityId, level: null}
                                        : currentMfa);
                                    const currentStepup = (currentOrganization.identityProvider.data.stepupEntities || [])
                                        .find(entry => entry.name === entityId);
                                    setStepupEntity(isEmpty(currentStepup)
                                        ? {name: entityId, level: null}
                                        : currentStepup);
                                })
                        }
                    } else {
                        setTabNames([tabs.information]);
                        setCurrentTab(tabs.information);
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

    const externalLink = (link, metaData, index) => {
        const attribute = link.languageProperty ?
            (I18n.locale === "en" ? metaData[`${link.metaData}:en`] : metaData[`${link.metaData}:nl`] || metaData[`${link.metaData}:en`]) :
            metaData[link.metaData];
        if (isEmpty(attribute)) {
            return null;
        }
        return (
            <a href={attribute} key={index} target="_blank" rel="noopener noreferrer">
                {link.localeAttribute ? I18n.t(`${link.locale}.${attribute.replace(/\./g, '')}`) : I18n.t(link.locale)}
            </a>
        );
    }

    const toggleShowAttributes = e => {
        stopEvent(e);
        setShowAttributes(!showAttributes);
    }

    const toggleShowPrivacy = e => {
        stopEvent(e);
        setShowPrivacy(!showPrivacy);
    }

    const findArpEntry = urn => {
        return arp.attributes.find(attr => attr.urn === urn);
    }

    const confirmationModalChildren = () => {
        if (confirmationModalOption === confirmationModalOptions.makeConnection) {
            return (
                <div className="connect-options-container">
                    <h3>{I18n.t("applicationConnect.defaultAccessTitle", {name: providerName(I18n.locale, serviceProvider)})}</h3>
                    <p>{I18n.t("applicationConnect.defaultAccessInfo")}</p>
                    <p>{I18n.t("applicationConnect.defaultAccessInfo2")}</p>
                </div>
            );
        } else if (confirmationModalOption === confirmationModalOptions.requestConnectionByMember) {
            return (
                <div className="connect-options-container">
                    <h3>{I18n.t("applicationConnect.requestMember")}</h3>
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("applicationConnect.memberRequestInfo.info",
                            {orgName: currentOrganization.name}))
                    }}/>
                    <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("applicationConnect.memberRequestInfo.subInfo"))}}/>
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
            setLoading(true);
            const manageIdentifierOrg = currentOrganization.manageIdentifier;
            cancelServiceProviderConnectionRequest(
                serviceProvider.id,
                serviceProvider.type,
                manageIdentifierOrg,
                message)
                .then(() => {
                    //Because user is an useEffect dependency, everything will reload. Including change requests
                    refreshUser(() => {
                        //a small timeout to prevent flickering - cancelling requests does not happen that often
                        setTimeout(() => setLoading(false), 75);
                    });
                    setFlash(I18n.t("applicationConnect.flash.cancelConnectionRequest"));
                });
        }
    }

    const doRequestConnection = (withConfirmation, modalOption) => {
        if (withConfirmation) {
            let newModalOption;
            const directConnectAllowed = connectWithoutInteraction(metaData, user);
            if (!isAdminUser) {
                newModalOption = confirmationModalOptions.requestConnectionByMember;
            } else if (directConnectAllowed) {
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
                okButton: I18n.t(!isAdminUser ? "applicationConnect.sendMessage" : "applicationConnect.connect")
            });
        } else {
            cancelConfirmation();
            setLoading(true);
            const manageIdentifierOrg = currentOrganization.manageIdentifier;
            connectServiceProviderToIdentityProvider(
                serviceProvider.id,
                serviceProvider.type,
                manageIdentifierOrg,
                message)
                .then(() => {
                    if (modalOption === confirmationModalOptions.requestConnectionByMember) {
                        setFlash(I18n.t("applicationConnect.flash.requestConnectionByMember"));
                        setMemberRequestSend(true);
                        setLoading(false);
                    } else {
                        setFlash(I18n.t(`applicationConnect.flash.${modalOption}`));
                        //Because user is an useEffect dependency, everything will reload. Including change requests
                        refreshUser(() => {
                            //a small timeout to prevent flickering - connecting apps does not happen that often
                            setTimeout(() => setLoading(false), 75);
                        });
                    }
                }).catch(() => {
                setLoading(false);
                setConfirmationModalOption(null);
                setConfirmation({
                    open: true,
                    cancel: null,
                    action: () => cancelConfirmation(),
                    title: I18n.t("error.title"),
                    isError: true,
                    question: I18n.t("error.jiraDown"),
                    okButton: I18n.t("forms.ok")
                })
            })
        }
    }

    const cancelDisconnectionRequest = (withConfirmation, e) => {
        stopEvent(e);
        setConfirmationModalOption(null);
        if (withConfirmation) {
            setConfirmation({
                open: true,
                cancel: () => cancelConfirmation(),
                action: () => cancelDisconnectionRequest(false),
                title: I18n.t("appAccess.cancelRequestTitle"),
                okButton: I18n.t("forms.sure"),
                question: I18n.t("appAccess.cancelDisrequestQuestion"),
            });
        } else {
            cancelConfirmation();
            setLoading(true);
            const manageIdentifierOrg = currentOrganization.manageIdentifier;
            cancelServiceProviderDisconnectionRequest(
                serviceProvider.id,
                serviceProvider.type,
                manageIdentifierOrg,
                message)
                .then(() => {
                    //Because user is an useEffect dependency, everything will reload. Including change requests
                    refreshUser(() => {
                        //a small timeout to prevent flickering - cancelling requests does not happen that often
                        setTimeout(() => setLoading(false), 75);
                    });
                    setFlash(I18n.t("applicationConnect.flash.cancelConnectionRequest"));
                });
        }
    }

    const doRequestDisconnection = (withConfirmation) => {
        if (withConfirmation) {
            const newModalOption = confirmationModalOptions.requestDisconnectConnection;
            setConfirmationModalOption(newModalOption);
            setConfirmation({
                open: true,
                cancel: () => cancelConfirmation(),
                action: () => doRequestDisconnection(false),
                title: null,
                question: I18n.t("applicationConnect.disconnectRequestedQuestion"),
                okButton: I18n.t("applicationConnect.disconnectRequested")
            });
        } else {
            cancelConfirmation();
            setLoading(true);
            const manageIdentifierOrg = currentOrganization.manageIdentifier;
            disconnectServiceProviderToIdentityProvider(
                serviceProvider.id,
                serviceProvider.type,
                manageIdentifierOrg,
                message)
                .then(() => {
                    setFlash(I18n.t("applicationConnect.flash.requestConnectionByMember"));
                    //Because user is an useEffect dependency, everything will reload. Including change requests
                    refreshUser(() => {
                        //a small timeout to prevent flickering - connecting apps does not happen that often
                        setTimeout(() => setLoading(false), 75);
                    });
                }).catch(() => {
                setLoading(false);
                setConfirmationModalOption(null);
                setConfirmation({
                    open: true,
                    cancel: null,
                    action: () => cancelConfirmation(),
                    title: I18n.t("error.title"),
                    isError: true,
                    question: I18n.t("error.jiraDown"),
                    okButton: I18n.t("forms.ok")
                })
            })
        }
    }

    const goBackToApplications = e => {
        stopEvent(e);
        navigate(-1);
    }

    const renderCurrentTab = () => {
        switch (currentTab) {
            case  tabs.access: {
                return renderAccessApp();
            }
            case  tabs.information: {
                return renderInformation();
            }
            case  tabs.consent: {
                return renderConsent();
            }
            case  tabs.assurance: {
                return renderAssurance();
            }
        }
    }

    const tabChanged = name => {
        setCurrentTab(name);
    }

    const renderAccessApp = () => {
        return (
            <>
                {readOnly && <Alert alertType={AlertType.Warning}
                                    asChild={true}
                                    children={<a href="/" onClick={e => cancelConnectionRequest(true, e)}>
                                        {I18n.t("appAccess.cancelRequest")}</a>}
                                    message={I18n.t("appAccess.requestedAccessNotification", {ticketKey: changeRequestTicketKey})}/>
                }
                {pendingDisconnect && <Alert alertType={AlertType.Warning}
                                             asChild={true}
                                             children={<a href="/" onClick={e => cancelDisconnectionRequest(true, e)}>
                                                 {I18n.t("appAccess.cancelRequest")}</a>}
                                             message={I18n.t("appAccess.requestedDisconnectNotification", {ticketKey: changeRequestTicketKey})}/>
                }
                <div className={`app-access ${readOnly ? "read-only" : ""}`} onClick={e => readOnly && stopEvent(e)}>
                    <>
                        <div className="app-access-central">
                            <h2>{I18n.t("appAccess.title")}</h2>
                            <InfoBlock className="no-gap">
                                <div className="grouped">
                                    <div>
                                        <h3>{I18n.t("appAccess.users", {name: currentOrganization.name})}</h3>
                                        <p>{I18n.t("appAccess.config")}</p>
                                    </div>
                                    <Button type={ButtonType.Primary}
                                            onClick={() => {
                                                useAppStore.setState({
                                                    activeMenuItem: mainMenuItems.policies
                                                });
                                                navigate(`/policies?service=${encodeURIComponent(serviceProvider.data.entityid)}`);
                                            }}
                                            txt={I18n.t("appAccess.edit")}/>
                                </div>
                                <div className="access-card large">
                                    <h4>{I18n.t(`appAccess.${isEmpty(policies) ? "everyBody" : "notEveryBody"}`,
                                        {name: currentOrganization.name})}</h4>
                                    {!isEmpty(policies) &&
                                        <Chip type={ChipType.Status_info}
                                              label={I18n.t("appAccess.policies", {nbr: policies.length})}
                                              className={"policies-active"}/>
                                    }
                                    {renderLogo(currentOrganization?.identityProvider?.data?.metaDataFields)}
                                </div>
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
                                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("appAccess.noDecentralAccess"))}}/>
                                </div>
                            </InfoBlock>
                        </div>
                    </>
                </div>
            </>
        );
    }

    const cancelConsentChanges = () => {
        const entityId = serviceProvider.data.entityid;
        const currentConsent = (currentOrganization.identityProvider.data.disableConsent || [])
            .find(entry => entry.name === entityId);
        setConsent(isEmpty(currentConsent) ? {
            name: entityId,
            type: CONSENT.default_consent,
            "explanation:nl": "",
            "explanation:en": ""
        } : currentConsent)

    }
    const submitConsentChanges = () => {
        const newConsent = {...consent, identityProviderId: currentOrganization.identityProvider.id}
        setLoading(true);
        saveIdentityProviderConsent(newConsent)
            .then(() => {
                setFlash(I18n.t("consent.flash.consentUpdated"));
                setLoading(false);
                refreshUser();
            })
    }

    const cancelAssuranceChanges = () => {
        const entityId = serviceProvider.data.entityid;
        const currentMfa = (currentOrganization.identityProvider.data.mfaEntities || [])
            .find(entry => entry.name === entityId);
        setMfaEntity(isEmpty(currentMfa) ? {name: entityId, level: null} : currentMfa);
        const currentStepup = (currentOrganization.identityProvider.data.stepupEntities || [])
            .find(entry => entry.name === entityId);
        setStepupEntity(isEmpty(currentStepup) ? {name: entityId, level: null} : currentStepup);
    }

    const submitAssuranceChanges = () => {
        const stepUpLoa = stepupLoaInteger(stepupEntity.level);
        const mfaLoa = mfaLoaInteger(mfaEntity.level);
        if (stepUpLoa > user.loaLevel || mfaLoa > user.loaLevel) {
            return;
        }
        const payload = {
            identityProviderId: currentOrganization.identityProvider.id,
            mfaEntity,
            stepupEntity,
        };
        setLoading(true);
        saveIdentityProviderAssurance(payload)
            .then(() => {
                setFlash(I18n.t("assurance.flash.assuranceUpdated"));
                setLoading(false);
                refreshUser();
            })
    }

    const renderAssurance = () => {
        const stepupLoaTooLow = stepupEntity.level !== null && stepupLoaInteger(stepupEntity.level) > user.loaLevel;
        const mfaLoaTooLow = mfaEntity.level !== null && mfaLoaInteger(mfaEntity.level) > user.loaLevel;
        return (
            <div className="assurance-container">
                <div className="assurance-left">
                    <h2>{I18n.t("assurance.mfaTitle")}</h2>
                    <p className="info">{I18n.t("assurance.mfaInfo")}</p>
                    <div className="assurance-info">
                        <ul>
                            <li>{I18n.t("assurance.mfaBlock.refeds")}</li>
                            <li>{I18n.t("assurance.mfaBlock.microSoft")}</li>
                        </ul>

                    </div>
                    <SelectField name={I18n.t("assurance.mfaLevel")}
                                 className="select-assurance"
                                 value={mfaOptions.find(o => o.value === mfaEntity.level) || null}
                                 options={mfaOptions}
                                 placeholder={I18n.t("assurance.mfaSelectPlaceholder")}
                                 searchable={false}
                                 clearable={true}
                                 onChange={option => setMfaEntity({...mfaEntity, level: option ? option.value : null})}
                    />
                    {mfaLoaTooLow && <ErrorIndicator standalone={true}
                                                     msg={I18n.t("assurance.mfaLoaTooLow")}/>}
                    <h2>{I18n.t("assurance.stepupTitle")}</h2>
                    <p className="info">{I18n.t("assurance.stepupInfo")}</p>
                    <div className="assurance-info">
                        <p>{I18n.t("assurance.stepupBlock.choose")}</p>
                        <ul>
                            <li>{I18n.t("assurance.stepupBlock.level1")}</li>
                            <li>{I18n.t("assurance.stepupBlock.level2")}</li>
                            <li>{I18n.t("assurance.stepupBlock.level3")}</li>
                        </ul>

                    </div>

                    <SelectField name={I18n.t("assurance.stepupLevel")}
                                 className="select-assurance"
                                 value={stepupOptions.find(o => o.value === stepupEntity.level) || null}
                                 options={stepupOptions}
                                 placeholder={I18n.t("assurance.stepupSelectPlaceholder")}
                                 searchable={false}
                                 clearable={true}
                                 onChange={option => setStepupEntity({
                                     ...stepupEntity,
                                     level: option ? option.value : null
                                 })}
                    />
                    {stepupLoaTooLow && <ErrorIndicator standalone={true}
                                                        msg={I18n.t("assurance.loaTooLow")}/>}
                    <div className="assurance-actions">
                        <Button onClick={() => cancelAssuranceChanges()}
                                type={ButtonType.Secondary}
                                txt={I18n.t("forms.cancel")}/>
                        <Button onClick={() => submitAssuranceChanges()}
                                disabled={mfaLoaTooLow || stepupLoaTooLow}
                                txt={I18n.t("forms.save")}/>
                    </div>
                </div>
                <div className="assurance-right">
                    <InfoBlock className="assurance-info-block">
                        <h2>{I18n.t("assurance.tipsInfo")}</h2>
                        <p>{I18n.t("assurance.tips.practice")}</p>
                        <ol>
                            <li>{I18n.t("assurance.tips.optionMfa")}</li>
                            <li>{I18n.t("assurance.tips.optionSurf")}</li>
                        </ol>
                        <p className="info" dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("consent.info"))
                        }}/>
                        <p className="warning">
                            <AlertIcon/>
                            <span dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("assurance.tips.warning"))
                        }}/>
                        </p>
                        <p>{I18n.t("assurance.tips.authentication")}</p>
                    </InfoBlock>
                </div>

            </div>
        );
    }

    const renderConsent = () => {
        return (
            <div className="consent-container">
                <div className="consent-left">
                    <h2>{I18n.t("consent.title")}</h2>
                    <p className="info" dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("consent.info"))
                    }}/>
                    <SelectField name={I18n.t("consent.type")}
                                 className="select-consent"
                                 value={consentOptions.find(option => option.value === consent.type)}
                                 options={consentOptions}
                                 searchable={false}
                                 clearable={false}
                                 onChange={option => setConsent({...consent, type: option.value})}
                    />
                    <p className="warnings" dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("consent.warnings"))
                    }}/>
                    <InputField name={I18n.t("consent.warningEN")}
                                value={consent["explanation:en"]}
                                onChange={e => setConsent({...consent, ["explanation:en"]: e.target.value})}/>
                    <InputField name={I18n.t("consent.warningNL")}
                                value={consent["explanation:nl"]}
                                onChange={e => setConsent({...consent, ["explanation:nl"]: e.target.value})}/>
                    <div className="consent-actions">
                        <Button onClick={() => cancelConsentChanges()}
                                type={ButtonType.Secondary}
                                txt={I18n.t("forms.cancel")}/>
                        <Button onClick={() => submitConsentChanges()}
                                txt={I18n.t("forms.save")}/>
                    </div>

                </div>
                <div className="consent-right">
                    <h2>{I18n.t("consent.example")}</h2>
                    <ExampleSVG/>
                </div>
            </div>
        );
    }

    const renderInformation = () => {
        return renderDetailsApp();
    }

    const chipTypeForConnectionStatus = () => {
        if (readOnly) {
            return ChipType.Status_error;
        }
        if (pendingDisconnect) {
            return ChipType.Status_warning;
        }
        return ChipType.Status_info;
    }

    const translationForConnectionStatus = () => {
        if (readOnly) {
            return I18n.t("accessibleApps.connectRequested");
        }
        if (pendingDisconnect) {
            return I18n.t("accessibleApps.disconnectRequested");
        }
        return I18n.t("accessibleApps.connectionMade");
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
                            <div className="accessible-options">
                                <Chip type={chipTypeForConnectionStatus()}
                                      label={translationForConnectionStatus()}/>
                                {(!readOnly && currentOrganization.manageIdentifier && isAdminUser && !pendingDisconnect)
                                    && <Button onClick={() => doRequestDisconnection(true)}
                                               type={ButtonType.DestructiveSecondary}
                                               txt={I18n.t("applicationConnect.disconnect")}/>
                                }
                            </div>
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
                {showAttributes && <a href="/" onClick={toggleShowAttributes}>
                    {I18n.t("applicationDetail.hide")}
                </a>}
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
            {showPrivacy && <a href="/" onClick={toggleShowPrivacy}>
                {I18n.t("applicationDetail.hide")}
            </a>}

        </div>;
    }

    const renderQuickLinks = () => {
        return (
            <>
                <p className="info no-margin">{I18n.t("applicationDetail.quickLinks")}</p>
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
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(I18n.t("applicationDetail.wiki"),
                                    {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})
                            }}/>
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
                                    __html: DOMPurify.sanitize(I18n.t('applicationDetail.registrationInfo', {url: metaData["mdrpi:RegistrationInfo"]}),
                                        {ADD_ATTR: ['target'], ADD_TAGS: ['rel']}),
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }
    let connectButtonPostFixTxt;
    if (isAdminUser) {
        connectButtonPostFixTxt = connectWithoutInteraction(metaData, user) ? "connect" : "request"
    } else {
        connectButtonPostFixTxt = memberRequestSend ? "requested" : "requestMember";
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
                        <a href="/#" onClick={goBackToApplications}>{I18n.t("applicationConnect.back")}</a>
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
                            {(!anonymous && currentOrganization.manageIdentifier) &&
                                <Button onClick={() => doRequestConnection(true)}
                                        disabled={memberRequestSend}
                                        txt={I18n.t(`applicationConnect.${connectButtonPostFixTxt}`)}/>}
                        </div>
                        {renderDetailsApp()}
                    </div>
                </div>
            </>
        );
    }

    const {open, cancel, isError, action, question, title, okButton} = confirmation;

    return (
        <div className={`application-detail-container`}>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         isError={isError}
                                         disabledConfirm={confirmationModalOption === confirmationModalOptions.requestConnectionByMember
                                             && isEmpty(message)}
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
