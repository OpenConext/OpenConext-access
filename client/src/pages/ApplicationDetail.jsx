import {PolicyCard} from "../policies/PolicyCard.jsx";
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
import I18n, {tArray} from "../locale/I18n.js";
import {useNavigate, useParams} from "react-router";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Alert,
    AlertAction,
    AlertDescription,
    Badge,
    Button,
    Card,
    CardContent,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@surfnet/curve-react";
import {ArrowSquareOutIcon, CaretLeftIcon as ArrowLeftIcon, ClockIcon, HourglassHighIcon, InfoIcon, PlusIcon, XCircleIcon} from "@phosphor-icons/react";
import PlaceHolderImage from "../icons/placeholder-image.svg";

import ExampleSVG from "../icons/wayf.svg";
import {APPLICATION_LINKS, connectWithoutInteraction, CONSENT, MFA_LEVELS, providerDescription, providerName, providerOrganizationName, STEPUP_LEVELS} from "../utils/Manage.js";
import {isEmpty, sanitize, stopEvent} from "../utils/Utils.js";
import {policyTypes} from "../utils/Policy.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {authorities, deriveAccess, isAdmin} from "../utils/Permissions.js";
import InputField from "../components/InputField.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {TabHeader} from "../components/TabHeader.jsx";
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

const SECURE_ID_INFO_URL = "https://servicedesk.surf.nl/wiki/spaces/IAM/pages/198967724/Using+Levels+of+Assurance+to+express+strength+of+authentication";

const idpOptionKeys = ["multipleauthn", "mfa", "iapMedium", "iapHigh", "iapMediumMfa", "iapHighMfa"];

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

const MAX_ITEMS_EXPANDED = 2;

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
    const {manageType, manageId, tab = Object.values(tabs)[0]} = useParams();

    const [tabNames, setTabNames] = useState(Object.values(tabs));
    const [currentTab, setCurrentTab] = useState(tab);
    const [loading, setLoading] = useState(true);
    const [serviceProvider, setServiceProvider] = useState({});
    const [accessRoles, setAccessRoles] = useState({});
    const [policies, setPolicies] = useState([]);
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
        return <div className="loading-container"><Spinner className="size-8"/></div>
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

    const findArpEntry = urn => {
        return arp.attributes.find(attr => attr.urn === urn);
    }

    const confirmationModalChildren = () => {
        if (confirmationModalOption === confirmationModalOptions.makeConnection) {
            return (
                <div className="connect-options-container">
                    <h3 className="text-[length:var(--text-lg-font-size)] mb-5">{I18n.t("applicationConnect.defaultAccessTitle", {name: providerName(I18n.locale, serviceProvider)})}</h3>
                    <p>{I18n.t("applicationConnect.defaultAccessInfo")}</p>
                    <p>{I18n.t("applicationConnect.defaultAccessInfo2")}</p>
                </div>
            );
        } else if (confirmationModalOption === confirmationModalOptions.requestConnectionByMember) {
            return (
                <div className="connect-options-container">
                    <h3 className="text-[length:var(--text-lg-font-size)] mb-5">{I18n.t("applicationConnect.requestMember")}</h3>
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
                    <h3 className="text-[length:var(--text-lg-font-size)] mb-5">{I18n.t("applicationConnect.requestConnection")}</h3>
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
            } else if (directConnectAllowed || config.testEnvironment) {
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
                title: I18n.t("applicationConnect.disconnectConfirmTitle"),
                question: I18n.t(`applicationConnect.disconnectRequestedQuestion${config.testEnvironment ? "Test" : ""}`),
                okButton: I18n.t(`applicationConnect.disconnectRequested${config.testEnvironment ? "Test" : ""}`),
                isDeleteAction: true,
                className: "centered"
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
                    setFlash(I18n.t(`applicationConnect.flash.requestConnectionByMember${config.testEnvironment ? "Test" : ""}`));
                    //Because user is an useEffect dependency, everything will reload. Including change requests
                    refreshUser(() => {
                        //a small timeout to prevent flickering - disconnecting apps does not happen that often
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
        navigate(`/application-detail/${manageType}/${manageId}/${name}`);
    }

    const openRoleManagement = () => window.open(`${config.invite}/applications/${serviceProvider.id}`, "_blank").focus();

    // Carries enough context back through /policies for PolicyForm to show a
    // "back to application" link and for a new rule to be pre-scoped to this SP.
    const policyReturnParams = () => new URLSearchParams({
        manageType,
        manageId,
        appName: providerName(I18n.locale, serviceProvider)
    });

    const refreshPolicies = () => getPolicyByServiceProviderEntityId(serviceProvider.data.entityid, currentOrganization.id)
        .then(res => {
            res.forEach(policy => policy.originalName = policy.name);
            setPolicies(res);
        });

    const navigateToAddPolicy = policyType => {
        useAppStore.setState({activeMenuItem: mainMenuItems.policies});
        const params = policyReturnParams();
        params.set("entityId", serviceProvider.data.entityid);
        navigate(`/policies/details/${policyType}?${params.toString()}`);
    };

    const navigateToEditPolicy = policy => {
        useAppStore.setState({activeMenuItem: mainMenuItems.policies});
        navigate(`/policies/details/${policy.id}?${policyReturnParams().toString()}`);
    };

    const renderRoleCard = (role, index) => (
        <Card key={index} size="sm" className="access-detail-card">
            <CardContent className="access-detail-card-content">
                <div className="access-detail-card-text">
                    <p className="card-title">{role.name}</p>
                </div>
                <p className="role-user-count" dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("appAccess.roleUsers", {count: role.userRoleCount}))
                }}/>
                <Button variant="link" onClick={openRoleManagement}>
                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.details"))}}/>
                    <ArrowSquareOutIcon/>
                </Button>
            </CardContent>
        </Card>
    );

    const renderAccessApp = () => {
        //With many items the sections below the first one are pushed out of view, so all sections start collapsed together
        const collapseSections = policies.length > MAX_ITEMS_EXPANDED || (accessRoles || []).length > MAX_ITEMS_EXPANDED;
        return (
            <>
                {readOnly &&
                    <Alert variant={"info"} className={"max-w-[800px]"}>
                        <HourglassHighIcon/>
                        <AlertDescription>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.requestedAccessNotification", {ticketKey: changeRequestTicketKey}))}}/>
                        </AlertDescription>
                    </Alert>
                }
                {pendingDisconnect &&
                    <Alert variant={"info"} className={"max-w-[800px]"}>
                        <InfoIcon/>
                        <AlertDescription>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.requestedDisconnectNotification", {ticketKey: changeRequestTicketKey}))}}/>
                        </AlertDescription>
                    </Alert>
                }
                <div className={`app-access ${readOnly ? "read-only" : ""}`} onClick={e => readOnly && stopEvent(e)}>
                    <Accordion key={collapseSections ? "collapsed" : "expanded"}
                               defaultValue={collapseSections ? [] : ["policies", "roles"]}
                               className="access-accordion">
                        <AccordionItem value="policies">
                            <div className="accordion-header-row">
                                <p className="accordion-trigger-title">
                                    {`${I18n.t("appAccess.pdpPolicies")} (${policies.length})`}
                                </p>
                                <div className="accordion-header-actions">
                                    <Button variant="outline" disabled={readOnly} onClick={() => navigateToAddPolicy(policyTypes.reg)}>
                                        <PlusIcon/>
                                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.addAccessRule"))}}/>
                                    </Button>
                                    <AccordionTrigger className="accordion-toggle"/>
                                </div>
                            </div>
                            <AccordionContent>
                                {isEmpty(policies) &&
                                    <p className="zero-state">{I18n.t("appAccess.noPolicies")}</p>
                                }
                                {!isEmpty(policies) &&
                                    <div className="access-detail-cards">
                                        {policies.map(policy => <PolicyCard key={policy.id}
                                                            policy={policy}
                                                            serviceProviders={[serviceProvider]}
                                                            currentOrganization={currentOrganization}
                                                            refreshPolicies={refreshPolicies}
                                                            onEdit={navigateToEditPolicy}/>)}
                                    </div>}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="roles">
                            <div className="accordion-header-row">
                                <p className="accordion-trigger-title">
                                    {`${I18n.t("appAccess.rolesTitle")} (${isEmpty(accessRoles) ? 0 : accessRoles.length})`}
                                </p>
                                <div className="accordion-header-actions">
                                    <Button variant="outline" disabled={readOnly} onClick={openRoleManagement}>
                                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.addRole"))}}/>
                                        <ArrowSquareOutIcon/>
                                    </Button>
                                    <AccordionTrigger className="accordion-toggle"/>
                                </div>
                            </div>
                            <AccordionContent>
                                {!isEmpty(accessRoles) &&
                                    <div className="access-detail-cards">
                                        {accessRoles.map((role, index) => renderRoleCard(role, index))}
                                    </div>}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
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

    const saveAssurance = (newMfaEntity, newStepupEntity) => {
        setMfaEntity(newMfaEntity);
        setStepupEntity(newStepupEntity);
        //The user can not set a level higher than their own, see the error indicators
        const stepupLoaTooLow = newStepupEntity.level !== null && stepupLoaInteger(newStepupEntity.level) > user.loaLevel;
        const mfaLoaTooLow = newMfaEntity.level !== null && mfaLoaInteger(newMfaEntity.level) > user.loaLevel;
        if (stepupLoaTooLow || mfaLoaTooLow) {
            return;
        }
        setLoading(true);
        saveIdentityProviderAssurance({
            identityProviderId: currentOrganization.identityProvider.id,
            mfaEntity: newMfaEntity,
            stepupEntity: newStepupEntity
        })
            .then(() => {
                setFlash(I18n.t("assurance.flash.assuranceUpdated"));
                setLoading(false);
                refreshUser();
            })
            .catch(() => setLoading(false));
    }

    const renderAssurance = () => {
        const stepupLoaTooLow = stepupEntity.level !== null && stepupLoaInteger(stepupEntity.level) > user.loaLevel;
        const mfaLoaTooLow = mfaEntity.level !== null && mfaLoaInteger(mfaEntity.level) > user.loaLevel;
        const noneOption = {value: null, label: I18n.t("assurance.none"), description: I18n.t("assurance.noneDescription")};
        const idpOptions = [
            noneOption,
            ...idpOptionKeys.map(key => ({
                value: MFA_LEVELS[key],
                label: I18n.t(`assurance.idpOptions.${key}`),
                description: MFA_LEVELS[key]
            }))
        ];
        const secureIdOptions = [
            {value: null, label: I18n.t("assurance.none")},
            ...Object.keys(STEPUP_LEVELS).map(key => ({
                value: STEPUP_LEVELS[key],
                label: I18n.t(`assurance.secureIdOptions.${key}`)
            }))
        ];
        const baseLevelValue = (currentOrganization.identityProvider.data.supported_authncontext || [])[0];
        const baseLevelOption = tArray("myOrganization.mfa.options", option => option)
            .find(option => option.value === baseLevelValue) || null;
        const hasActiveStepPolicy = policies
            .some(policy => policy.data.type === policyTypes.step && policy.data.active);
        return (
            <div className="assurance-container">
                <div className="assurance-header">
                    <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("assurance.title")}</h2>
                    <p>{I18n.t("assurance.intro")}</p>
                </div>
                {hasActiveStepPolicy &&
                    <Alert variant="info">
                        <InfoIcon/>
                        <AlertDescription className="alert-description-with-action">
                            <span className="alert-text">
                                <strong className="alert-text-title">{I18n.t("assurance.activeRule.title")}</strong>
                                <span>{I18n.t("assurance.activeRule.info")}</span>
                            </span>
                            <AlertAction onClick={() => tabChanged(tabs.access)}>
                                <Button size="sm" variant="outline">{I18n.t("assurance.activeRule.toRules")}</Button>
                            </AlertAction>
                        </AlertDescription>
                    </Alert>}
                <SelectField name={I18n.t("assurance.baseLabel")}
                             className="select-assurance"
                             value={baseLevelOption}
                             options={[]}
                             info={I18n.t("assurance.baseInfo")}
                             infoUnderLabel={true}
                             disabled={true}
                />
                <div>
                    <SelectField name={I18n.t("assurance.idpLabel")}
                                 className="select-assurance"
                                 value={idpOptions.find(o => o.value === mfaEntity.level) || null}
                                 options={idpOptions}
                                 placeholder={I18n.t("assurance.selectPlaceholder")}
                                 info={I18n.t("assurance.idpInfo")}
                                 infoUnderLabel={true}
                                 showCheck={true}
                                 onChange={option => setMfaEntity({...mfaEntity, level: option.value})}
                    />
                    {mfaLoaTooLow && <ErrorIndicator standalone={true}
                                                     msg={I18n.t("assurance.mfaLoaTooLow")}/>}
                </div>
                <div>
                    <SelectField name={I18n.t("assurance.secureIdLabel")}
                                 className="select-assurance"
                                 value={secureIdOptions.find(o => o.value === stepupEntity.level) || null}
                                 options={secureIdOptions}
                                 placeholder={I18n.t("assurance.selectPlaceholder")}
                                 info={`<a href="${SECURE_ID_INFO_URL}" target="_blank" rel="noopener noreferrer">${I18n.t("assurance.secureIdInfo")}</a>`}
                                 infoUnderLabel={true}
                                 showCheck={true}
                                 onChange={option => setStepupEntity({...stepupEntity, level: option.value})}
                    />
                    {stepupLoaTooLow &&
                        <ErrorIndicator standalone={true}
                                        msg={I18n.t("assurance.loaTooLow")}/>}
                </div>
                <div className="assurance-actions">
                    <Button variant="outline" onClick={cancelAssuranceChanges}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/>
                    </Button>
                    <Button onClick={() => saveAssurance(mfaEntity, stepupEntity)}
                            disabled={mfaLoaTooLow || stepupLoaTooLow}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.save"))}}/>
                    </Button>
                </div>
            </div>
        );
    }

    const renderConsent = () => {
        return (
            <div className="consent-container">
                <div className="consent-left">
                    <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("consent.title")}</h2>
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
                                optional={true}
                                placeholder={I18n.t("consent.warningENPlaceholder")}
                                value={consent["explanation:en"]}
                                onChange={e => setConsent({...consent, ["explanation:en"]: e.target.value})}/>
                    <InputField name={I18n.t("consent.warningNL")}
                                optional={true}
                                placeholder={I18n.t("consent.warningNLPlaceholder")}
                                value={consent["explanation:nl"]}
                                onChange={e => setConsent({...consent, ["explanation:nl"]: e.target.value})}/>
                    <div className="consent-actions">
                        <Button onClick={() => cancelConsentChanges()}
                                variant="outline">
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/>
                        </Button>
                        <Button onClick={() => submitConsentChanges()}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.save"))}}/>
                        </Button>
                    </div>

                </div>
                <div className="consent-right">
                    <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("consent.example")}</h2>
                    <ExampleSVG/>
                </div>
            </div>
        );
    }

    const renderInformation = () => {
        return renderDetailsApp();
    }

    const badgeVariantForConnectionStatus = () => {
        if (readOnly || pendingDisconnect) {
            return "info";
        }
        return "success";
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
                               hrefFor={name => `/application-detail/${manageType}/${manageId}/${name}`}
                               tabNames={tabNames}
                    >
                        <div className="application-header">
                            {renderLogo(metaData)}
                            <div className="application-header-details">
                                <p className="organization">{providerOrganizationName(I18n.locale, serviceProvider)}</p>
                                <div className="application-header-top">
                                    <div className="application-header-top-title">
                                        <h3 className="text-[length:var(--text-2xl-font-size)]">{providerName(I18n.locale, serviceProvider)}</h3>
                                        <Badge variant={badgeVariantForConnectionStatus()}>
                                            {readOnly && <ClockIcon data-icon="inline-start"/>}
                                            {translationForConnectionStatus()}
                                        </Badge>
                                    </div>


                                    <div className="application-header-actions">
                                        {readOnly &&
                                            <Button onClick={e => cancelConnectionRequest(true, e)}
                                                    variant="outline">
                                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.cancelRequest"))}}/>
                                            </Button>
                                        }
                                        {pendingDisconnect && <Button variant="outline" onClick={e => cancelDisconnectionRequest(true, e)}>
                                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("appAccess.cancelRequest"))}}/>
                                        </Button>
                                        }
                                        {(!readOnly && currentOrganization.manageIdentifier && isAdminUser && !pendingDisconnect)
                                            && <Button onClick={() => doRequestDisconnection(true)}
                                                       variant="outline">
                                                <XCircleIcon/>
                                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("applicationConnect.disconnect"))}}/>
                                            </Button>
                                        }
                                    </div>
                                </div>
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
        const attributeEntries = serviceProvider.data.arp?.enabled ? Object.entries(serviceProvider.data.arp.attributes) : [];
        return (
            <section className="details-section">
                <p className="title">{I18n.t("applicationDetail.attributes")}</p>
                {!serviceProvider.data.arp?.enabled &&
                    <p>{I18n.t("applicationDetail.noArp")}</p>
                }
                {serviceProvider.data.arp?.enabled &&
                    <Table className="attributes-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{width: "15%"}}>{I18n.t("applicationDetail.attributeColumns.name")}</TableHead>
                                <TableHead style={{width: "20%"}}>{I18n.t("applicationDetail.attributeColumns.example")}</TableHead>
                                <TableHead style={{width: "15%"}}>{I18n.t("applicationDetail.attributeColumns.technicalName")}</TableHead>
                                <TableHead style={{width: "10%"}}>{I18n.t("applicationDetail.attributeColumns.source")}</TableHead>
                                <TableHead style={{width: "40%"}}>{I18n.t("applicationDetail.attributeColumns.explanation")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attributeEntries.map((entry, index) => {
                                const attribute = findArpEntry(entry[0]);
                                //ARP entries only have one value / source
                                const value = entry[1][0];
                                return (
                                    <TableRow key={index}>
                                        <TableCell>{attribute.friendlyNames[I18n.locale]}</TableCell>
                                        <TableCell>{attribute.example}</TableCell>
                                        <TableCell>{attribute.name}</TableCell>
                                        <TableCell>{I18n.t(`applicationDetail.arpSources.${value.source}`)}</TableCell>
                                        <TableCell>{isEmpty(value.motivation) ? "" : value.motivation}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                }
            </section>
        );
    }

    function renderAppPrivacy() {
        return (
            <section className="details-section">
                <p className="title">{I18n.t("applicationDetail.privacy")}</p>
                <p>{I18n.t("applicationDetail.privacyInfo")}</p>
                <div className="privacy-questions">
                    {privacy.map((item, index) => {
                            const question = item[`info_${I18n.locale}`];
                            const strippedQuestion = question.substring(question.indexOf(" ") + 1);
                            const answer = metaData[item.manage]
                            return (
                                <div className="privacy-question" key={index}>
                                    <span className="priv-name">{strippedQuestion}</span>
                                    <span className="priv-answer">
                                        {isEmpty(answer) ? I18n.t("applicationDetail.noPrivacyInfo") : answer}
                                    </span>
                                </div>
                            );
                        }
                    )}
                </div>
            </section>
        );
    }

    const quickLinksList = () => APPLICATION_LINKS.map((link, index) => externalLink(link, metaData, index))
        .filter(link => link !== null);

    const renderQuickLinksRow = links => (
        <div className="quick-links">
            {links.map((link, index) => (
                <React.Fragment key={link.key}>
                    {link}
                    {index < links.length - 1 && <span className="separator">|</span>}
                </React.Fragment>
            ))}
        </div>
    );

    const renderQuickLinks = () => {
        const links = quickLinksList();
        if (isEmpty(links)) {
            return null;
        }
        return (
            <section className="details-section">
                <p className="title">{I18n.t("applicationDetail.quickLinks")}</p>
                {renderQuickLinksRow(links)}
            </section>
        );
    }

    const renderLogo = metaDataFields => {
        const logoUrl = metaDataFields["logo:0:url"];
        return isEmpty(logoUrl) ? <PlaceHolderImage/> : <img src={logoUrl} alt=""/>
    }

    const renderDetailsApp = () => {
        const description = providerDescription(I18n.locale, serviceProvider);
        return (
            <div className="details">
                {!isEmpty(description) &&
                    <section className="details-section">
                        <p className="title">{I18n.t("applicationDetail.description")}</p>
                        <p>{description}</p>
                    </section>
                }
                {!anonymous && renderQuickLinks()}
                {renderAppAttributes()}
                {renderAppPrivacy()}
                <section className="details-section">
                    <p className="title">{I18n.t("applicationDetail.contractual")}</p>
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
                </section>
                <section className="details-section">
                    <p className="title">{I18n.t("applicationDetail.supportedEntityCategories")}</p>
                    <div className="entity-categories">
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
                </section>
                {metaData["mdrpi:RegistrationInfo"] && (
                    <section className="details-section">
                        <p className="title">{I18n.t('applicationDetail.interfedSource')}</p>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(I18n.t('applicationDetail.registrationInfo', {url: metaData["mdrpi:RegistrationInfo"]}),
                                    {ADD_ATTR: ['target'], ADD_TAGS: ['rel']}),
                            }}
                        />
                    </section>
                )}
            </div>
        );
    }
    let connectButtonPostFixTxt;
    if (isAdminUser) {
        connectButtonPostFixTxt = (connectWithoutInteraction(metaData, user) || config.testEnvironment) ? "connect" : "request"
    } else {
        connectButtonPostFixTxt = memberRequestSend ? "requested" : "requestMember";
    }

    const renderNonAccessibleApp = () => {
        const anonymousQuickLinks = anonymous ? quickLinksList() : [];
        return (
            <>
                <div className="inner-application-detail-container">
                    <div className={`application-detail ${anonymous ? "anonymous" : "stand-alone"}`}>
                        {anonymous &&
                            <div className="application-detail-back-link">
                                <Button variant="link" onClick={goBackToApplications}>
                                    <span data-icon="inline-start"><ArrowLeftIcon/></span>
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("applicationDetail.back"))}}/>
                                </Button>
                            </div>}
                        <div className="meta-data">
                            {renderLogo(metaData)}
                            <div className="meta-data-name">
                                <p className="organization">
                                    {providerOrganizationName(I18n.locale, serviceProvider)}
                                </p>
                                <p className="name">
                                    {providerName(I18n.locale, serviceProvider)}
                                </p>
                                {anonymous && !isEmpty(anonymousQuickLinks) && renderQuickLinksRow(anonymousQuickLinks)}
                            </div>
                            {(!anonymous && currentOrganization.manageIdentifier) &&
                                <Button onClick={() => doRequestConnection(true)}
                                        disabled={memberRequestSend}>
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t(`applicationConnect.${connectButtonPostFixTxt}`))}}/>
                                </Button>}
                        </div>
                        {renderDetailsApp()}
                    </div>
                </div>
            </>
        );
    }

    const {open, cancel, isError, action, question, title, okButton, isDeleteAction, className} = confirmation;

    return (
        <div className={`application-detail-container ${anonymous ? "anonymous" : ""}`}>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         isError={isError}
                                         isDeleteAction={isDeleteAction}
                                         className={className}
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
