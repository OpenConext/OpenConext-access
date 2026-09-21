import "./Connections.scss";
import React, {Fragment, useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import {
    ArrowRightIcon as ArrowRight,
    CaretDownIcon as CaretDown,
    CaretRightIcon as ArrowRightIcon,
    CheckCircleIcon,
    CircleDashedIcon as PendingIcon,
    CopyIcon,
    HourglassHighIcon,
    InfoIcon,
    TrashIcon,
    WarningIcon,
    XCircleIcon,
    XIcon as CloseIcon
} from "@phosphor-icons/react";
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Button,
    Checkbox,
    Label,
    RadioGroup,
    RadioGroupItem,
    Spinner,
    Switch,
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@surfnet/curve-react";
import "jsondiffpatch/formatters/styles/html.css";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {isEmpty, sanitize, stopEvent} from "../utils/Utils.js";
import {isValidUrl, validUrlRegExp} from "../validations/regExps.js";
import {
    deleteConnectionById,
    getConnectionById,
    identityProvidersByUsedConnection,
    newConnection,
    parseMedaData,
    parseMedaDataUrl,
    policiesByServiceProviders,
    relyingPartiesByOrganization,
    resetConnectionSecret,
    uniqueEntityID,
    updateConnection,
    updateAndRequestConnectionProductionStatus
} from "../api/index.js";
import UploadButton from "../components/UploadButton.jsx";
import {useAppStore} from "../stores/AppStore.js";
import DOMPurify from "dompurify";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {connectOptions, convertClientConnectionToServer, convertServerConnectionToClient, generateOIDCClientID, sections, visibilities} from "../utils/Connection.js";
import {CONNECTION_STATUS_BADGE_VARIANTS, CONNECTION_STATUSES, PROTOCOLS, STATE} from "../utils/Manage.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import SwitchField from "../components/SwitchField.jsx";
import {useNavigate} from "react-router";
import {ConnectionAlert} from "./ConnectionAlert.jsx";
import {createAndClickLink, domainName} from "../utils/Forms.js";
import {ChangeRequests} from "./ChangeRequests.jsx";
import {useShallow} from "zustand/react/shallow";
import {ConnectionInUseWarning, units} from "./ConnectionInUseWarning.jsx";
import {hasPolicyWriteAccess, isOrganizationAdmin, policyServiceProvider} from "../utils/Permissions.js";
import {mainMenuItems} from "../utils/MenuItems.js";

const metaData = {
    url: "url",
    file: "file",
    paste: "paste"
}

const grantTypes = {
    authorization_code: "authorization_code",
    refresh_token: "refresh_token",
    device_code: "urn:ietf:params:oauth:grant-type:device_code"
}

const modals = {
    resetSecretDisclaimer: "resetSecretDisclaimer",
    resetSecret: "resetSecret",
    deletionWarning: "deletionWarning",
}

const PendingProdIcon = () => <HourglassHighIcon weight="regular" size={20} className="pending"/>;

const connectionStatusKey = connection => {
    const productionConnectionNeedsActivation = connection.status === CONNECTION_STATUSES.COMPLETE;
    return productionConnectionNeedsActivation ? "ready_for_prod" :
        !isEmpty(connection.changeRequests) ? "open_change_requests" : connection.status.toLowerCase();
}

export const ConnectionStatusBadge = ({connection}) => {
    const status = connectionStatusKey(connection);
    return (
        <div className="status-chip">
            <Badge variant={CONNECTION_STATUS_BADGE_VARIANTS[status] || "secondary"}>
                {!isEmpty(connection.changeRequests) &&
                    <WarningIcon weight="fill" className="alert-triangle" data-icon="inline-start"/>}
                {I18n.t(`connection.connections.${status}`)}
            </Badge>
        </div>
    );
}

export const ConnectionsOverviewList = ({application, initConnection, viewConnection}) => {
    const connections = application.connections;
    if (isEmpty(connections)) {
        return (
            <div className="connections-overview-list">
                <div className="connection-overview-item create" onClick={() => initConnection()}>
                    <PendingIcon className="pending" size={20} weight="regular"/>
                    <span className="name">{I18n.t("connection.overviewCards.createConnection")}</span>
                    <ArrowRightIcon/>
                </div>
            </div>
        );
    }
    return (
        <div className="connections-overview-list">
            {connections.map(conn =>
                <div key={conn.id} className="connection-overview-item" onClick={() => viewConnection(conn)}>
                    <span className="name cut-of-line">{conn.name}</span>
                    <ConnectionStatusBadge connection={conn}/>
                    <ArrowRightIcon/>
                </div>
            )}
        </div>
    );
}

export const Connections = ({
                                application,
                                connection,
                                setConnection,
                                initConnection,
                                refresh,
                                currentOrganization,
                                user,
                                connectionComplete,
                                appInformationComplete,
                                connectionNeedsApproval,
                                protocolOptions,
                                arpInfo,
                                setTab,
                                profileOptions,
                                identityProviders,
                                setDirty,
                                connectionId,
                                scopes
                            }) => {

    const {config, setFlash} = useAppStore(useShallow(state => ({
        config: state.config,
        setFlash: state.setFlash
    })));

    const navigate = useNavigate();

    const [isCopyConnectionOpen, setIsCopyConnectionOpen] = useState(false);
    const [isMaxRefreshValidity, setIsMaxRefreshValidity] = useState(false);
    const [section, setSection] = useState(sections.technical);
    const [invalidLoginUrl, setInvalidLoginUrl] = useState(false);
    const [invalidRedirects, setInvalidRedirects] = useState({"0": false});
    const [invalidACSLocations, setInvalidACSLocations] = useState({"0": false});
    const [showImport, setShowImport] = useState(false);
    const [metaDataChoice, setMetaDataChoice] = useState(metaData.url);
    const [xmlMetaData, setXmlMetaData] = useState(null);
    const [urlMetaData, setUrlMetaData] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [duplicateEntityID, setDuplicateEntityID] = useState(false);
    const [duplicateScope, setDuplicateScope] = useState(false);
    const [initial, setInitial] = useState(true);
    const [showAdditionalAttributes, setShowAdditionalAttributes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [changeRequestsKeys, setChangeRequestsKeys] = useState([]);
    const [affectedIdentityProviders, setAffectedIdentityProviders] = useState([]);
    const [jiraKey, setJiraKey] = useState(null);
    const [relyingParties, setRelyingParties] = useState([]);

    const connections = application.connections;

    const redirectUrlRefs = useRef([]);
    const acsLocationRefs = useRef([]);

    useEffect(() => {
        if (!isEmpty(connectionId)) {
            const conn = application.connections.find(c => c.id === parseInt(connectionId, 10));
            if (isEmpty(conn)) {
                navigate(`/connection/${application.id}`);
            } else {
                showConnectionDetails(conn);
            }
        } else {
            const urlSearchParams = new URLSearchParams(window.location.search);
            const action = urlSearchParams.get("action");
            if (action === "activate") {
                showConnectionDetails(connections
                        .find(conn => conn.status === CONNECTION_STATUSES.COMPLETE),
                    "?action=activate");
            }
        }
        useAppStore.setState({
            activeMenuItem: mainMenuItems.yourApps
        });
    }, [application]);// eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (section === sections.customers && connection.protocol.value === PROTOCOLS.OAUTH20_RS) {
            relyingPartiesByOrganization(currentOrganization.id).then(res => setRelyingParties(res));
        }
    }, [section]);// eslint-disable-line react-hooks/exhaustive-deps

    const isPending = sectionName => {
        return !sections.isComplete(connection, sectionName);
    }

    const isDisabled = sectionName => {
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        switch (sectionName) {
            case sections.technical: {
                return false;
            }
            case sections.informationProfile: {
                return !sections.isComplete(connection, sections.technical) || !technicalValid();
            }
            case sections.testConnection: {
                return !sections.isComplete(connection, isRs ? sections.technical : sections.informationProfile) || !technicalValid();
            }
            case sections.publish: {
                return !sections.isComplete(connection, sections.testConnection) || !technicalValid();
            }
            case sections.customers: {
                return !sections.isComplete(connection, sections.testConnection) || !technicalValid();
            }
        }
        return false;
    }

    const copyConnectionData = otherConnectionId => {
        setLoading(true);
        getConnectionById(otherConnectionId).then(res => {
            const convertedConnection = convertServerConnectionToClient(res, protocolOptions, profileOptions, arpInfo);
            const originalName = convertedConnection.name;
            convertedConnection.name = originalName + " COPY";
            convertedConnection.sectionsComplete = 0;
            convertedConnection.state = STATE.testaccepted;
            //Filter out all unknown entityIDs
            convertedConnection.allowedEntities = convertedConnection.allowedEntities
                .filter(entityID => identityProviders.some(idp => idp.data.entityid === entityID));
            //To prevent update instead of create
            ["id", "manageEid", "manageIdentifier", "manageVersion", "createdAt", "updatedAt"]
                .forEach(attr => delete convertedConnection[attr]);
            convertedConnection.status = CONNECTION_STATUSES.OPEN;
            convertedConnection.entityID = "";
            if (convertedConnection.protocol.value === PROTOCOLS.OIDC10_RP) {
                convertedConnection.secret = null;
                convertedConnection.secretSet = false;
            }
            convertedConnection.new = true;
            convertedConnection.changeRequests = [];
            setConnection(convertedConnection);
            if (section === sections.pendingChanges) {
                setSection(sections.technical);
            }
            //Need to some time, otherwise the view goes back to the overview
            setTimeout(() => setLoading(false), 175);
            setFlash(I18n.t("connection.flash.copied", {name: originalName}))
        })
    }

    const isDuplicateConnectionName = () => {
        const nbr = application.connections.filter(conn => conn.name === connection.name).length;
        return connection.id ? nbr > 1 : nbr === 1;
    }

    const hasDuplicateScope = options => (options || []).some(option => option.__isNew__ &&
        scopes.some(scope => scope.name.trim().toLowerCase() === (option.value || "").trim().toLowerCase()));

    const scopesChanged = options => {
        setConnection({...connection, scopes: options});
        setDuplicateScope(hasDuplicateScope(options));
    }

    const technicalValid = () => {
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isSaml = connection.protocol.value === PROTOCOLS.SAML20_SP;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        return !(duplicateEntityID || isEmpty(connection.name) || (isEmpty(connection.entityID) && !isOidc && !isRs) ||
            isDuplicateConnectionName() ||
            (isOidc && Object.values(invalidRedirects).some(invalid => invalid)) ||
            (!isRs && (isEmpty(connection.loginUrl) || invalidLoginUrl)) ||
            (isSaml && Object.values(invalidACSLocations).some(invalid => invalid)) ||
            (isOidc && (isEmpty(connection.grantTypes) || isEmpty(connection.redirectUrls.filter(url => !isEmpty(url.trim()))))) ||
            (isSaml && (isEmpty(connection.acsLocations || isEmpty(connection.acsLocations.filter(url => !isEmpty(url.trim())))))) ||
            (isRs && duplicateScope));
    }

    const informationProfileValid = () => {
        const requiresMotivation = arpInfo.profiles.find(p => p.name === connection.profile.value).requiresMotivation
        if (requiresMotivation && isEmpty(connection.profileMotivation)) {
            return false;
        }
        if (Object.values(connection.motivations).some(motivation => isEmpty(motivation))) {
            return false;
        }
        return true;
    }

    const changeSection = sectionName => {
        setSection(sectionName);
    }

    const resetMetaData = () => {
        setFileName(null);
        setShowImport(false);
        setXmlMetaData(null)
        setUrlMetaData(null);
        setMetaDataChoice(metaData.url);
    }

    const renderRadioOptions = (name, value, labels, labelResolver, onChange, orientation = "column", descriptionResolver = null) => (
        <RadioGroup value={value}
                    onValueChange={onChange}
                    className={`radio-options-group ${orientation}`}>
            {labels.map(label =>
                <div className="radio-item" key={`${name}_${label}`}>
                    <RadioGroupItem value={label} id={`${name}_${label}`}/>
                    <div className="radio-item-content">
                        <label htmlFor={`${name}_${label}`}>{labelResolver(label)}</label>
                        {descriptionResolver && <span className="radio-item-description">{descriptionResolver(label)}</span>}
                    </div>
                </div>
            )}
        </RadioGroup>
    );

    const grantTypeChanged = (grantType, selected) => {
        let newGrantTypes = connection.grantTypes;
        if (selected) {
            newGrantTypes.push(grantType);
        } else {
            newGrantTypes = newGrantTypes.filter(gt => gt !== grantType);
        }
        setConnection({...connection, grantTypes: newGrantTypes});
    }

    const addRedirectURL = e => {
        stopEvent(e);
        setConnection({...connection, redirectUrls: [...connection.redirectUrls, ""]});
        focusRedirectURL();
    };

    const removeRedirectURL = index => {
        const newRedirectUrls = [...connection.redirectUrls]
        newRedirectUrls.splice(index, 1);
        setConnection({...connection, redirectUrls: newRedirectUrls});
    };

    const redirectUrlValueChanged = (e, index) => {
        const newRedirectUrls = [...connection.redirectUrls];
        newRedirectUrls[index] = e.target.value;
        setConnection({...connection, redirectUrls: newRedirectUrls});
        setInvalidRedirects({...invalidRedirects, [index.toString()]: false});
    }

    const redirectUrlValueBlurred = (e, index) => {
        const value = e.target.value;
        //Empty values are picked up the other validations
        const valid = isValidUrl(value.trim());
        setInvalidRedirects({...invalidRedirects, [index.toString()]: !valid});
        return true;
    }

    const focusRedirectURL = () => {
        setTimeout(() => acsLocationRefs.current[connection.acsLocations.length]?.focus(), 675);
    }

    const addACSLocation = e => {
        stopEvent(e);
        setConnection({...connection, acsLocations: [...connection.acsLocations, ""]});
        focusACSLocation();
    };

    const removeACSLocation = index => {
        const newACSLocation = [...connection.acsLocations]
        newACSLocation.splice(index, 1);
        setConnection({...connection, acsLocations: newACSLocation});
    };

    const focusACSLocation = () => {
        setTimeout(() => acsLocationRefs.current[connection.acsLocations.length]?.focus(), 675);
    }

    const acsLocationChanged = (e, index) => {
        const newACSLocations = [...connection.acsLocations]
        newACSLocations[index] = e.target.value;
        setConnection({...connection, acsLocations: newACSLocations});
        setInvalidACSLocations({...invalidACSLocations, [index.toString()]: false});
    }

    const acsLocationValueBlurred = (e, index) => {
        const value = e.target.value;
        //Empty values are picked up the other validations
        const valid = isValidUrl(value.trim());
        setInvalidACSLocations({...invalidACSLocations, [index.toString()]: !valid});
        return true;
    }

    const doParseMedaData = () => {
        const promise = metaDataChoice === metaData.url ? parseMedaDataUrl(urlMetaData) : parseMedaData(xmlMetaData);
        promise.then(res => {
            setShowImport(false);
            const newConnection = {...connection, ...res[0]}
            setConnection(newConnection);
            resetMetaData();
            setFlash(I18n.t("connection.metadata.parsed"));
        }).catch(() => {
            setFlash(I18n.t("connection.metadata.errorParsed"), "error");
        })
    }

    const onFileUpload = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const xml = reader.result.toString();
                setXmlMetaData(xml);
                setFileName(file.name);
            };
            reader.readAsText(file);
        }
    };

    const changeProtocol = option => {
        if (option.value === PROTOCOLS.OIDC10_RP) {
            setConnection({
                ...connection,
                protocol: option,
                grantTypes: ["authorization_code"],
                pkce: false,
                entityID: "",
                redirectUrls: [""],
                acsLocations: null
            })
        } else if (option.value === PROTOCOLS.SAML20_SP) {
            setConnection({
                ...connection, protocol: option,
                grantTypes: null,
                pkce: false,
                entityID: "",
                redirectUrls: null,
                acsLocations: [""]
            })
        } else if (option.value === PROTOCOLS.OAUTH20_RS) {
            setConnection({
                ...connection,
                protocol: option,
                grantTypes: null,
                pkce: false,
                entityID: "",
                redirectUrls: null,
                acsLocations: null,
                NameIDFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
                scopes: [{label: "openid", value: "openid"}]
            })

        }
    }

    const doDeleteConnection = confirmationRequired => {
        if (!connection.id) {
            backToMainOverview();
        } else if (confirmationRequired) {
            setLoading(true);
            //First, fetch all the possible identityProviders affected by the deletion of this connection,
            //and check if there are any outstanding policies that block deletion
            Promise.all([
                identityProvidersByUsedConnection(connection.id),
                policiesByServiceProviders(connection.entityID ? [connection.entityID] : [])
            ]).then(([idpRes, policiesRes]) => {
                setLoading(false);
                if (policiesRes.length > 0) {
                    const policyWriteAccess = hasPolicyWriteAccess(user, application, policiesRes);
                    setConfirmation({
                        open: true,
                        cancel: policyWriteAccess ? () => setConfirmation({}) : null,
                        outstandingPolicies: true,
                        policyWriteAccess: policyWriteAccess,
                        header: I18n.t("forms.delete"),
                        action: () => {
                            setConfirmation({open: false});
                            if (policyWriteAccess) {
                                navigate(`/policies?service=${policyServiceProvider(policiesRes)}`)
                            }
                        },
                        question: null,
                        okButton: policyWriteAccess ? I18n.t("forms.editPolicies") : I18n.t("forms.ok")
                    });
                } else {
                    setAffectedIdentityProviders(idpRes);
                    setConfirmation({
                        open: true,
                        cancel: () => {
                            setConfirmation({open: false});
                            setAffectedIdentityProviders([]);
                        },
                        header: I18n.t("forms.delete"),
                        question: I18n.t("connection.deleteConfirmation"),
                        action: () => doDeleteConnection(false),
                        modal: modals.deletionWarning,
                        okButton: I18n.t((connection.status === CONNECTION_STATUSES.PROD_READY && !isEmpty(idpRes)) ? "forms.deleteAnyway" : "forms.delete")
                    });
                }
            });
        } else {
            setLoading(true);
            setAffectedIdentityProviders([]);
            deleteConnectionById(connection.id).then(() => {
                refresh("allConnections");
                setConfirmation({open: false});
                setLoading(false);
                setFlash(I18n.t("connection.flash.deleted", {
                    name: connection.name
                }));
            })
        }
    }

    const newClientSecret = (e, confirmationRequired) => {
        stopEvent(e);
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                question: null,
                header: I18n.t("connection.connectionOverview.secretResetTitle"),
                cancel: () => setConfirmation({open: false}),
                action: () => newClientSecret(null, false),
                modal: modals.resetSecretDisclaimer,
                okButton: I18n.t("connection.connectionOverview.reset")
            });
        } else {
            setLoading(true);
            resetConnectionSecret(connection.id).then(res => {
                setConnection({...connection, secret: res.secret})
                setConfirmation({
                    open: true,
                    header: I18n.t("connection.connectionOverview.secretResetNew"),
                    cancel: null,
                    question: null,
                    action: () => setConfirmation({open: false}),
                    modal: modals.resetSecret,
                    okButton: I18n.t("connection.connectionOverview.resetContinue")
                });
                setLoading(false);
            })
        }
    }

    const onBlurEntityID = (e) => {
        uniqueEntityID(e.target.value).then(res => {
            const duplicated = (connection.status === !CONNECTION_STATUSES.OPEN && res.length > 1) ||
                (connection.status === CONNECTION_STATUSES.OPEN && res.length > 0)
            setDuplicateEntityID(duplicated);
        });
    };

    const checkRefreshTokenValidity = e => {
        let val = e.target.value;
        if (isEmpty(val) || isNaN(parseInt(val, 10))) {
            val = 3600;
            setConnection({...connection, refreshTokenValidity: val});
        }
    }

    const changeRefreshTokenValidity = e => {
        setIsMaxRefreshValidity(false);
        let val = e.target.value;
        if (isEmpty(val)) {
            val = 0;
        } else {
            val = parseInt(val, 10);
            if (isNaN(val)) {
                val = 0;
            } else if (val > 3600 * 24) {
                val = 3600 * 24;
                setIsMaxRefreshValidity(true);
            }
        }
        setConnection({...connection, refreshTokenValidity: val});
    }

    const renderTechnicalSection = () => {
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        return (
            <section className="inner-right">
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.technical")}</h3>
                <InputField value={connection.name || ""}
                            onChange={e => setConnection({...connection, name: e.target.value})}
                            name={I18n.t("connection.connectionName")}
                            required={true}
                            isAlert={changeRequestsKeys.includes("name")}
                            placeholder={I18n.t("connection.connectionPlaceholder",
                                {
                                    application: application.name
                                })}
                />
                {(!initial && isEmpty(connection.name)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("connection.connectionName")})}
                                    adjustMargin={true}/>}
                {isDuplicateConnectionName() &&
                    <ErrorIndicator msg={I18n.t("connection.duplicatedName", {name: connection.name})}
                                    adjustMargin={true}/>}

                <SelectField name={I18n.t("connection.protocol")}
                             value={connection.protocol}
                             options={protocolOptions}
                             required={true}
                             toolTip={isEmpty(connection.manageIdentifier) ? null : I18n.t("connection.protocolTooltip")}
                             disabled={!isEmpty(connection.manageIdentifier)}
                             onChange={changeProtocol}
                />
                {isRs &&
                    <SelectField name={I18n.t("connection.scopes")}
                                 optional={true}
                                 options={[]}
                                 value={connection.scopes}
                                 isMulti={true}
                                 searchable={true}
                                 creatable={true}
                                 placeholder={I18n.t("connection.scopePlaceholder")}
                                 onChange={scopesChanged}
                                 info={I18n.t("connection.scopeInfo", {schachome: currentOrganization.schacHomeOrganization.replaceAll(".", "-")})}
                    />}
                {(isRs && duplicateScope) &&
                    <ErrorIndicator msg={I18n.t("connection.duplicateScope")}
                                    adjustMargin={true}/>}

                {!isRs &&
                    <InputField value={connection.loginUrl || ""}
                                onChange={e => {
                                    setConnection({...connection, loginUrl: e.target.value});
                                    setInvalidLoginUrl(false);
                                }}
                                name={I18n.t("connection.loginUrl")}
                                required={true}
                                onBlur={e => setInvalidLoginUrl(!isValidUrl(e.target.value))}
                                isAlert={changeRequestsKeys.includes("loginUrl")}
                                placeholder={I18n.t("connection.loginUrlPlaceholder")}
                    />}
                {(!isRs && !initial && isEmpty(connection.loginUrl)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("connection.loginUrl")})}
                                    adjustMargin={true}/>}
                {(!isRs && invalidLoginUrl) &&
                    <ErrorIndicator msg={I18n.t("forms.invalidURL", {name: I18n.t("connection.loginUrl")})}
                                    adjustMargin={true}/>}
                {isRs && <>

                </>}


                {connection.protocol.value === PROTOCOLS.OIDC10_RP &&
                    <>
                        <div>
                            <span className="label">{I18n.t("connection.grantTypes")}
                                {changeRequestsKeys.includes("grantTypes") && <Tooltip>
                                    <TooltipTrigger render={<WarningIcon weight="fill" className="alert-triangle"/>}/>
                                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                                </Tooltip>}
                            </span>
                            <div className="grant-types">
                                {Object.keys(grantTypes).map(grantType => {
                                    const active = connection.grantTypes.includes(grantTypes[grantType]);
                                    const expanded = active && (grantType === grantTypes.authorization_code ||
                                        grantType === grantTypes.refresh_token);
                                    return (
                                        <div key={grantType} className={`grant-type-card ${expanded ? "expanded" : ""}`}>
                                            <section className="grant-type">
                                                <span>{I18n.t(`connection.${grantType}`)}</span>
                                                <Switch name={grantType}
                                                        checked={active}
                                                        onCheckedChange={val => grantTypeChanged(grantTypes[grantType], val)}/>
                                            </section>
                                            {(grantType === grantTypes.authorization_code && active) &&
                                                <section className="grant-type pkce">
                                                    <span className="pkce-label">{I18n.t("connection.clientTypeQuestion")}</span>
                                                    {renderRadioOptions("pkce", connection.pkce ? "true" : "false",
                                                        ["false", "true"],
                                                        label => I18n.t(`connection.clientType.${label === "true" ? "public" : "confidential"}`),
                                                        value => setConnection({
                                                            ...connection,
                                                            pkce: value === "true"
                                                        }), "column",
                                                        label => (
                                                            <span className="pkce-description">
                                                                {I18n.t(`connection.clientType.${label === "true" ? "public" : "confidential"}Description`)}
                                                                {label === "true" &&
                                                                    <Tooltip>
                                                                        <TooltipTrigger render={<InfoIcon/>}/>
                                                                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.pkceTooltip"))}}/></TooltipContent>
                                                                    </Tooltip>}
                                                            </span>
                                                        ))}

                                                </section>
                                            }
                                            {(grantType === grantTypes.refresh_token && active) &&
                                                <>
                                                    <section className="grant-type refresh-token-validity">
                                                        <InputField name={I18n.t("connection.refreshTokenValidity")}
                                                                    value={isEmpty(connection.refreshTokenValidity) ? 3600 : connection.refreshTokenValidity}
                                                                    isInteger={true}
                                                                    maxLength={3600 * 24}
                                                                    customClassName="refresh-token-validity"
                                                                    onBlur={checkRefreshTokenValidity}
                                                                    onChange={changeRefreshTokenValidity}/>
                                                    </section>
                                                    {isMaxRefreshValidity &&
                                                        <em className="warning">{I18n.t("connection.refreshTokenMax", {max: 3600 * 24})}</em>}
                                                </>

                                            }
                                        </div>
                                    );
                                })}
                                {(!initial && isEmpty(connection.grantTypes)) &&
                                    <ErrorIndicator
                                        msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.grantType")})}
                                        adjustMargin={true}/>}
                            </div>
                        </div>
                        <div className="redirect-urls-container">
                            <span className="label no-margin">{I18n.t("connection.redirectUrls")}
                                {changeRequestsKeys.includes("redirectUrls") && <Tooltip>
                                    <TooltipTrigger render={<WarningIcon weight="fill" className="alert-triangle"/>}/>
                                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                                </Tooltip>}</span>
                            <div className="redirect-urls">
                                {connection.redirectUrls.map((value, index) =>
                                    <div className="redirect-url" key={index}>
                                        <div className="redirect-url-inner">
                                            <InputField value={value}
                                                        onChange={e => redirectUrlValueChanged(e, index)}
                                                        onBlur={e => redirectUrlValueBlurred(e, index)}
                                                        onRef={el => redirectUrlRefs.current[index] = el}
                                                        placeholder={I18n.t("connection.redirectUrlsPlaceholder")}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeRedirectURL(index)}>
                                                <TrashIcon/>
                                            </Button>
                                            <Tooltip>
                                                <TooltipTrigger
                                                    render={<Button onClick={() => createAndClickLink(`https://www.ssllabs.com/ssltest/analyze.html?d=${domainName(value)}`)}>
                                                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.testSection"))}}/>
                                                    </Button>}/>
                                                <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.sslGradeTooltip"))}}/></TooltipContent>
                                            </Tooltip>
                                        </div>
                                        {invalidRedirects[index.toString()] &&
                                            <ErrorIndicator msg={I18n.t("forms.invalidURL",
                                                {name: I18n.t("connection.redirectUrl")})}
                                            />
                                        }
                                    </div>
                                )}
                            </div>
                            <Button variant="link"
                                    onClick={e => addRedirectURL(e)}>{I18n.t("connection.addRedirectUrl")}</Button>
                        </div>
                        {(!initial && isEmpty(connection.redirectUrls.filter(redirectUrl => !isEmpty(redirectUrl.trim())))) &&
                            <ErrorIndicator msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.redirectUrl")})}
                                            adjustMargin={true}/>}

                        <SwitchField name={"claimsInIdToken"}
                                     isAlert={changeRequestsKeys.includes("claimsInIdToken")}
                                     value={connection.claimsInIdToken || false}
                                     onChange={val => setConnection({...connection, claimsInIdToken: val})}
                                     label={I18n.t("connection.claimsInIdToken")}
                                     className={"no-top-margin"}
                                     info={I18n.t("connection.claimsInIdTokenTooltip")}
                        />
                    </>
                }

                {connection.protocol.value === PROTOCOLS.SAML20_SP &&
                    <>
                        <div className="import-metadata">
                            <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("connection.configuration")}</h2>
                            {!showImport && <Button variant="secondary"
                                                    onClick={() => setShowImport(true)}
                            >
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.import"))}}/>
                            </Button>}
                        </div>
                        {showImport &&
                            <div className="show-import">
                                <div className="show-import-header">
                                    <p>{I18n.t("connection.metadata.how")}</p>
                                    <CloseIcon onClick={() => setShowImport(false)}/>

                                </div>
                                {renderRadioOptions("how", metaDataChoice, Object.values(metaData),
                                    label => I18n.t(`connection.metadata.${label}`),
                                    value => setMetaDataChoice(value))}
                                {metaDataChoice === metaData.url && <>
                                    <span className="label top">{I18n.t("connection.metadata.urlMetaData")}</span>
                                    <div className="meta-data-url">
                                        <InputField value={urlMetaData}
                                                    onChange={e => setUrlMetaData(e.target.value)}/>
                                        <Button onClick={() => doParseMedaData()}
                                                variant={validUrlRegExp.test(urlMetaData) ? undefined : "secondary"}
                                                disabled={!validUrlRegExp.test(urlMetaData)}>
                                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.metadata.import"))}}/>
                                        </Button>
                                    </div>
                                </>}
                                {metaDataChoice === metaData.file && <div className="meta-data-file">
                                    {fileName && <>
                                        <div className="file-name-section">
                                            <span>{fileName}</span>
                                            <Button variant="ghost" size="icon"
                                                    onClick={() => setFileName(null)}>
                                                <CloseIcon/>
                                            </Button>
                                        </div>
                                        <Button onClick={() => doParseMedaData()}
                                                disabled={false}>
                                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.metadata.import"))}}/>
                                        </Button>
                                    </>}
                                    {!fileName && <UploadButton name={"meta-date-file"}
                                                                acceptFileFormat={".xml"}
                                                                txt={I18n.t("connection.metadata.chooseFile")}
                                                                onFileUpload={onFileUpload}/>}
                                </div>}
                                {metaDataChoice === metaData.paste && <>
                                    <span className="label top">{I18n.t("connection.metadata.doPaste")}</span>
                                    <div className="meta-data-url">
                                        <InputField value={xmlMetaData}
                                                    multiline={true}
                                                    onChange={e => setXmlMetaData(e.target.value)}/>
                                        <Button onClick={() => doParseMedaData()}
                                                variant={!isEmpty(xmlMetaData) ? undefined : "secondary"}
                                                disabled={isEmpty(xmlMetaData)}>
                                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.metadata.import"))}}/>
                                        </Button>
                                    </div>
                                </>}

                            </div>}
                        <InputField value={connection.entityID || ""}
                                    onChange={e => {
                                        setConnection({...connection, entityID: e.target.value});
                                        setDuplicateEntityID(false);
                                    }}
                                    name={I18n.t("connection.entityID")}
                                    required={true}
                                    onBlur={e => onBlurEntityID(e)}
                                    placeholder={I18n.t("connection.entityIDPlaceHolder")}
                        />
                        {(!initial && isEmpty(connection.entityID)) &&
                            <ErrorIndicator msg={I18n.t("forms.required",
                                {name: I18n.t("connection.entityID")})}
                                            adjustMargin={true}/>}
                        {duplicateEntityID &&
                            <ErrorIndicator msg={I18n.t("connection.duplicateEntityID",
                                {entityID: connection.entityID})}
                                            adjustMargin={true}/>}

                        <div className="acs-locations-container">
                            <span className="label no-margin">{I18n.t("connection.acsLocations")}</span>
                            <div className="acs-locations">
                                {connection.acsLocations.map((value, index) =>
                                    <div className="acs-location" key={index}>
                                        <div className="acs-location-inner" key={index}>
                                            <InputField value={value}
                                                        onChange={e => acsLocationChanged(e, index)}
                                                        onBlur={e => acsLocationValueBlurred(e, index)}
                                                        onRef={el => acsLocationRefs.current[index] = el}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeACSLocation(index)}>
                                                <TrashIcon/>
                                            </Button>
                                            <Tooltip>
                                                <TooltipTrigger
                                                    render={<Button onClick={() => createAndClickLink(`https://www.ssllabs.com/ssltest/analyze.html?d=${domainName(value)}`)}>
                                                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.testSection"))}}/>
                                                    </Button>}/>
                                                <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.sslGradeTooltip"))}}/></TooltipContent>
                                            </Tooltip>

                                        </div>
                                        {invalidACSLocations[index.toString()] &&
                                            <ErrorIndicator msg={I18n.t("forms.invalidURL",
                                                {name: I18n.t("connection.acsLocation")})}
                                            />
                                        }
                                    </div>
                                )}
                            </div>
                            <Button variant="link"
                                    onClick={e => addACSLocation(e)}>
                                {I18n.t("connection.addACSLocation")}
                            </Button>
                        </div>
                        {(!initial && isEmpty(connection.acsLocations.filter(acsLocation => !isEmpty(acsLocation.trim())))) &&
                            <ErrorIndicator msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.acsLocation")})}
                                            adjustMargin={true}/>}
                    </>
                }
            </section>
        );
    }

    const renderTestIdPSection = () => {
        const iDps = config.identityProviders;
        const allowedEntities = connection.allowedEntities || [];
        const testEntityIdentifiers = iDps.map(idp => idp.entityid);
        const dummyIdpsActive = !isEmpty(connection.allowedEntities);
        return (
            <section className="test-idp-section">
                <p className="test-accounts-title">
                    <span>{I18n.t("connection.testConnectionSection.testAccountsTitle")}</span>
                    <span className="optional">{I18n.t("connection.testConnectionSection.testAccountsOptional")}</span>
                </p>
                <p>{I18n.t("connection.testConnectionSection.testAccountsInfo")}</p>
                <SwitchField name={"activateTest"}
                             value={!isEmpty(allowedEntities)}
                             className={dummyIdpsActive ? "active" : ""}
                             onChange={val => {
                                 setConnection({
                                     ...connection,
                                     allowedEntities: val ? testEntityIdentifiers : []
                                 })
                             }}
                             label={I18n.t("connection.productionStatusSection.dummyIdP")}
                />
                {dummyIdpsActive &&
                    <section className={`identity-providers ${dummyIdpsActive ? "active" : ""}`}>
                        {iDps.map((idp, index) =>
                            <div key={index} className="idp">
                                <div className="idp-info">
                                    <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(idp.name)}}/>
                                    <p dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(idp[`description${I18n.locale.toUpperCase()}`],
                                            {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]})
                                    }}/>
                                </div>
                            </div>
                        )}
                    </section>}
            </section>
        );
    }

    const renderTestConnectionSection = () => {
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        const isRp = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isRsOrRp = isRs || isRp;
        const showFreshlyGeneratedSecret = isRsOrRp && !isEmpty(connection.originalSecret);
        const showRefreshSecret = isRsOrRp && isEmpty(connection.originalSecret);
        const prodConnection = connection.status === CONNECTION_STATUSES.PROD_READY;

        return (
            <section className="inner-right">
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t(`connection.${isRs ? "testAndPublish" : "testConnection"}`)}</h3>
                {(isRs && prodConnection) &&
                    <Alert variant="success">
                        <CheckCircleIcon/>
                        <AlertTitle>{I18n.t("connection.productionStatusSection.readyTitle")}</AlertTitle>
                    </Alert>}
                {(isRs && !isEmpty(jiraKey)) && renderProductionStatusRequested()}
                {isRp && <p>{I18n.t("connection.testConnectionSection.info")}</p>}
                {isRs && <p>{I18n.t("connection.testConnectionSection.infoRS")}</p>}
                {showFreshlyGeneratedSecret &&
                    alertInfo(I18n.t("connection.connectionOverview.disclaimer"), null, null, null, "warning")}
                {isRsOrRp && <>

                    <div className="oidc-authentication">
                        <InputField name={I18n.t("connection.connectionOverview.discovery")}
                                    value={config.discovery}
                                    disabled={true}
                                    copyClipBoard={true}/>
                        <InputField name={I18n.t("connection.connectionOverview.clientID")}
                                    value={connection.entityID}
                                    disabled={true}
                                    copyClipBoard={true}/>
                        {showFreshlyGeneratedSecret &&
                            <InputField name={I18n.t("connection.connectionOverview.secret")}
                                        value={connection.originalSecret}
                                        disabled={true}
                                        copyClipBoard={true}/>}
                        {showRefreshSecret &&
                            <div className="secret-link">
                                <span className="label">{I18n.t("connection.connectionOverview.secret")}</span>
                                <span>{I18n.t("connection.connectionOverview.secretReset")}

                                </span>
                                <Button variant="link" onClick={e => newClientSecret(e, true)}>
                                    {I18n.t("connection.connectionOverview.secretResetLink")}
                                </Button>

                            </div>}
                    </div>
                </>}
                {!isRsOrRp &&
                    <div>
                        <p className="saml-test"
                           dangerouslySetInnerHTML={{
                               __html: DOMPurify.sanitize(I18n.t("connection.connectionOverview.test")
                                   , {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]})
                           }}/>
                        <div className="saml-meta-data">
                            <InputField name={I18n.t("connection.connectionOverview.entityID")}
                                        value={connection.entityID}
                                        disabled={true}
                                        copyClipBoard={true}/>
                            <InputField name={I18n.t("connection.connectionOverview.idpProxyMetaData")}
                                        value={config.idpProxyMetaData}
                                        disabled={true}
                                        copyClipBoard={true}/>
                        </div>
                    </div>}
                {(!isRs && !prodConnection) && renderTestIdPSection()}
            </section>
        );
    }

    const renderPublishSection = () => {
        const pendingProd = connection.status === CONNECTION_STATUSES.PENDING_PROD;
        const prodConnection = connection.status === CONNECTION_STATUSES.PROD_READY;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        //Same URL as the accessCatalogusAppURL custom field JiraClient sends to Jira
        const accessCatalogusAppURL = `${config.clientUrl}/application-detail/${connection.protocol.value}/${connection.manageIdentifier}`;
        const copyAccessCatalogusAppURL = () => {
            navigator.clipboard.writeText(accessCatalogusAppURL)
                .then(() => setFlash(I18n.t("forms.copied")));
        }
        return (
            <section className="inner-right">
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.publish")}</h3>
                {prodConnection &&
                    <Alert variant="success">
                        <CheckCircleIcon/>
                        <AlertTitle>{I18n.t("connection.productionStatusSection.readyTitle")}</AlertTitle>
                        <AlertDescription className="alert-description-with-action">
                            <span>
                                <p dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.productionStatusSection.readyDescription"))}}/>
                                <p>{accessCatalogusAppURL}</p>
                            </span>
                            <AlertAction>
                                <Button size="sm" variant="outline" onClick={copyAccessCatalogusAppURL}>
                                    <CopyIcon/>
                                    {I18n.t("connection.productionStatusSection.copyUrl")}
                                </Button>
                            </AlertAction>
                        </AlertDescription>
                    </Alert>}
                {!isEmpty(jiraKey) && renderProductionStatusRequested()}
                {(pendingProd && isEmpty(jiraKey)) &&
                    alertInfo(I18n.t("connection.productionStatusSection.pendingProdDisclaimerDescription"),
                        I18n.t("connection.productionStatusSection.pendingProdDisclaimerTitle"))}
                {(!pendingProd && !appInformationComplete) &&
                    alertInfo(I18n.t("connection.productionStatusSection.appInformationIncomplete"), null,
                        () => setTab("application"),
                        I18n.t("connection.productionStatusSection.fillAppInformation"),
                        "warning")}
                {!isRs &&
                    <>
                        <div className="visibility-options-container">
                            <div className="visibility-options">
                                <p className="question">{I18n.t("connection.visibilities.who")}
                                    {changeRequestsKeys.includes("visibility") && <Tooltip>
                                        <TooltipTrigger render={<WarningIcon weight="fill" className="alert-triangle"/>}/>
                                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                                    </Tooltip>}
                                </p>
                                {renderRadioOptions("visibility", connection.visibility,
                                    [visibilities.visible_to_all, visibilities.visible_to_none],
                                    label => I18n.t(`connection.visibilities.${label}`),
                                    value => setConnection({
                                        ...connection,
                                        visibility: value
                                    }),
                                    "column",
                                    label => I18n.t(`connection.visibilities.${label}Description`))}
                            </div>
                            <div className="visibility-options">
                                <p className="question">{I18n.t("connection.visibilities.connect")}
                                    {changeRequestsKeys.includes("connectOption") && <Tooltip>
                                        <TooltipTrigger render={<WarningIcon weight="fill" className="alert-triangle"/>}/>
                                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                                    </Tooltip>}
                                </p>
                                {renderRadioOptions("connectOption", connection.connectOption,
                                    [
                                        connectOptions.connect_without_interaction_without_email,
                                        connectOptions.connect_without_interaction_with_email,
                                        connectOptions.connect_with_interaction
                                    ],
                                    label => I18n.t(`connection.visibilities.${label}`),
                                    value => setConnection({
                                        ...connection,
                                        connectOption: value
                                    }))}
                            </div>
                            {(user.superUser || isOrganizationAdmin(user, currentOrganization)) &&
                                <div className="visibility-options">
                                    <p className="question">{I18n.t("connection.visibilities.eduIdAccess")}</p>
                                    <p className="eduid-access-info"
                                       dangerouslySetInnerHTML={{
                                           __html: DOMPurify.sanitize(I18n.t("connection.visibilities.eduIdAccessInfo"),
                                               {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]})
                                       }}/>
                                    <Label>
                                        <Checkbox checked={connection.eduIdAccessEnabled || false}
                                                  onCheckedChange={checked => setConnection({
                                                      ...connection,
                                                      eduIdAccessEnabled: checked
                                                  })}/>
                                        {I18n.t("connection.visibilities.eduIdAccessLabel")}
                                    </Label>
                                    <p className="disclaimer" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.visibilities.disclaimer"))}}/>
                                </div>}
                        </div>
                    </>}
            </section>
        );
    }

    const renderCustomersSection = () => {
        const options = relyingParties
            .filter(relyingParty => !isEmpty(relyingParty.metaData?.entityID))
            .map(relyingParty => ({value: relyingParty.metaData.entityID, label: relyingParty.name}));
        const allowedResourceServers = connection.allowedResourceServers || [];
        const value = allowedResourceServers
            .map(resourceServer => options.find(option => option.value === resourceServer.name) ||
                {value: resourceServer.name, label: resourceServer.name});
        return (
            <section className="inner-right">
                {isEmpty(options) && <p>{I18n.t("connection.noCustomers")}</p>}
                {!isEmpty(options) && <>
                    <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.customers")}</h3>
                    <SelectField name={I18n.t("connection.customersSection.question")}
                                 options={options}
                                 value={value}
                                 isMulti={true}
                                 searchable={true}
                                 onChange={selectedOptions => setConnection({
                                     ...connection,
                                     allowedResourceServers: (selectedOptions || []).map(option => ({name: option.value}))
                                 })}
                    />
                </>}
            </section>
        );
    }

    const renderProductionStatusRequested = () => {
        return (
            <Alert variant="info">
                <HourglassHighIcon/>
                <AlertTitle>{I18n.t("connection.connections.requestProductionStatusPostTitle")}</AlertTitle>
                <AlertDescription dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("connection.connections.requestProductionStatusPostDescription",
                        {jiraKey: jiraKey}))
                }}/>
            </Alert>
        );
    }

    const toggleAdditionalAttributes = val => {
        setConnection({...connection, motivations: [], additionalAttributes: []})
        setShowAdditionalAttributes(val);
    }

    const changeAdditionalAttributes = (attribute, val) => {
        const additionalAttributes = connection.additionalAttributes || [];
        if (val) {
            setConnection({...connection, additionalAttributes: [...additionalAttributes, attribute]})
        } else {
            setConnection({
                ...connection,
                additionalAttributes: [...additionalAttributes.filter(attr => attr !== attribute)]
            })
        }
    }

    const changeMotivation = (e, attribute) => {
        const motivations = connection.motivations;
        const newMotivations = {...motivations};
        newMotivations[attribute] = e.target.value;
        setConnection({...connection, motivations: newMotivations})
    }

    const changeProfile = option => {
        setConnection({...connection, additionalAttributes: [], profile: option, profileMotivation: ""})
    }

    const renderInformationProfileSection = () => {
        const profileName = connection.profile?.value || arpInfo.profiles[0].name;
        const profileInfo = I18n.translations[I18n.locale].connection.informational.profiles[profileName].info;
        const currentProfile = arpInfo.profiles.find(profile => profile.name === profileName);
        const isContentApp = application.type === "CONTENT";
        //These are the attributes added in ManageImport. We will show them as regular attributes
        const extraAttributesOutsideBundle = connection.additionalAttributes.filter(attr => !currentProfile.optionalAttributes.includes(attr));
        const allAttributes = currentProfile.attributes.concat(extraAttributesOutsideBundle);
        const scopeValuesPresent = allAttributes.some(name => arpInfo.attributes.find(attr => attr.name === name).scopedValue)
        return (
            <section className="inner-right-informational">
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.informationProfile")}{changeRequestsKeys.includes("arp") && <Tooltip>
                    <TooltipTrigger render={<WarningIcon weight="fill" className="alert-triangle"/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                </Tooltip>}</h3>
                {isContentApp && alertInfo(I18n.t("connection.informational.contentAppAlert"), null, null, null, "warning")}
                {!isContentApp && <p className="disclaimer"
                                     dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.informational.disclaimer"))}}/>}
                <SelectField
                    name={I18n.t("connection.informationProfile")}
                    options={profileOptions}
                    disabled={isContentApp}
                    value={connection.profile}
                    onChange={changeProfile}
                />
                {!isEmpty(profileInfo) &&
                    <p className="profile-info">{profileInfo}</p>}
                <p className="attributes"
                   dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.informational.attributes"))}}/>

                <div className="attributes">
                    {allAttributes.map((attribute, index) => {
                            const arpAttribute = arpInfo.attributes.find(attr => attr.name === attribute);
                            return (
                                <Fragment key={index}>
                                    <span>{attribute}{arpAttribute.scopedValue && <sup>*</sup>}</span>
                                    <span>{arpAttribute.example}</span>
                                </Fragment>
                            );
                        }
                    )}
                </div>
                {scopeValuesPresent &&
                    <p className="scoped-value-disclaimer">
                        <sup>* </sup>{I18n.t("connection.informational.scopedValueAttributeDisclaimer")}</p>}

                {currentProfile.requiresMotivation &&
                    <div className="profile=motivation">
                        <InputField value={connection.profileMotivation}
                                    name={I18n.t("connection.informational.profileMotivation")}
                                    placeholder={I18n.t("connection.informational.profileMotivationPlaceholder")}
                                    onChange={e => setConnection({...connection, profileMotivation: e.target.value})}
                                    multiline={true}/>
                        {(!initial && isEmpty(connection.profileMotivation)) &&
                            <ErrorIndicator
                                msg={I18n.t("forms.required", {name: I18n.t("connection.informational.motivation")})}
                            />}
                        <p className="profile-info">{I18n.t("connection.informational.profileMotivationDisclaimer")}</p>
                    </div>}
                {(!isEmpty(currentProfile.optionalAttributes) && application.type !== "CONTENT") &&
                    <>
                        <section className="additional-attributes">
                            <span>{I18n.t("connection.informational.additionalAttributes")}</span>
                            <Switch name="additionalAttributes"
                                    checked={showAdditionalAttributes || !isEmpty(connection.additionalAttributes)}
                                    onCheckedChange={toggleAdditionalAttributes}/>
                        </section>
                        {(showAdditionalAttributes || !isEmpty(connection.additionalAttributes)) &&
                            <>
                                <p className="available-attributes">{I18n.t("connection.informational.availableAttributes")}</p>
                                {currentProfile.optionalAttributes.map((optionalAttribute, index) => {
                                    const selected = connection.additionalAttributes.includes(optionalAttribute);
                                    const arpAttribute = arpInfo.attributes.find(attr => attr.name === optionalAttribute);
                                    const arpSource = connection.arp.attributes[arpAttribute.urn]?.[0];
                                    const defaultArpValue = arpSource?.value === "*";
                                    return (
                                        <div key={index}
                                             className={`additional-attributes optional ${!selected ? "dormant" : ""}`}>
                                            <section className="optional-attribute">
                                                <div className="additional-attribute-info">
                                                    <span>{optionalAttribute}</span>
                                                    <span>{arpInfo.attributes.find(attr => attr.name === optionalAttribute).info[I18n.locale]}</span>
                                                </div>
                                                <Switch name={`extraAttribute_${index}`}
                                                        checked={selected}
                                                        onCheckedChange={val => changeAdditionalAttributes(optionalAttribute, val)}/>
                                            </section>
                                            {(selected && !defaultArpValue && arpSource) &&
                                                <InputField value={arpSource.value}
                                                            name={I18n.t("connection.informational.value")}
                                                            copyClipBoard={true}
                                                            disabled={true}/>
                                            }
                                            {(selected) &&
                                                <InputField value={connection.motivations[optionalAttribute] || ""}
                                                            name={I18n.t("connection.informational.motivation")}
                                                            placeholder={I18n.t("connection.informational.motivationPlaceholder")}
                                                            onChange={e => changeMotivation(e, optionalAttribute)}
                                                            multiline={true}/>
                                            }
                                            {(!initial && selected && isEmpty(connection.motivations[optionalAttribute])) &&
                                                <ErrorIndicator
                                                    msg={I18n.t("forms.required", {name: I18n.t("connection.informational.motivation")})}
                                                />}
                                            {(selected && arpAttribute.scopedValue && defaultArpValue) &&
                                                alertInfo(I18n.t("connection.informational.scopedValueAttributeDisclaimer"), null, null, null, "warning")
                                            }
                                        </div>
                                    )
                                })}
                            </>}

                    </>}

            </section>
        );
    }

    const alertInfo = (description, title, action, actionLabel, alertType = "info") => {
        const Icon = alertType === "error" ? XCircleIcon : alertType === "warning" ? WarningIcon : InfoIcon;
        return (
            <Alert variant={alertType === "error" ? "danger" : alertType === "warning" ? "warning" : "info"}>
                <Icon/>
                {title && <AlertTitle>{title}</AlertTitle>}
                <AlertDescription className={action ? "alert-description-with-action" : undefined}>
                    <span dangerouslySetInnerHTML={{__html: sanitize(description)}}/>
                    {action && <AlertAction onClick={action}>
                        <Button size="sm" variant="outline">{actionLabel}</Button>
                    </AlertAction>}
                </AlertDescription>
            </Alert>
        )
    }

    const renderSection = () => {
        switch (section) {
            case sections.technical: {
                return renderTechnicalSection();
            }
            case sections.informationProfile: {
                return renderInformationProfileSection();
            }
            case sections.testConnection: {
                return renderTestConnectionSection();
            }
            case sections.publish: {
                return renderPublishSection();
            }
            case sections.customers: {
                return renderCustomersSection();
            }
            case sections.pendingChanges: {
                return <ChangeRequests connectionName={connection.name}
                                       changeRequests={connection.changeRequests}
                                       metaData={connection.metaData}
                                       setConfirmation={setConfirmation}
                                       setLoading={setLoading}
                                       refresh={refresh}
                                       arpInfo={arpInfo}
                />
            }
        }
    }

    const storeAndNextDisabled = () => {
        if (section === sections.publish && !appInformationComplete) {
            return true;
        }
        if (initial) {
            return false;
        }
        switch (section) {
            case sections.technical: {
                return !technicalValid();
            }
            case sections.informationProfile: {
                return !informationProfileValid();
            }
            case sections.testConnection: {
                return false;
            }
            case sections.publish: {
                return !appInformationComplete;
            }
            case sections.pendingChanges: {
                return false;
            }
            case sections.customers: {
                return false;
            }
        }
    }

    const determineNextSection = currentSection => {
        switch (currentSection) {
            case sections.technical:
                return connection.protocol.value === PROTOCOLS.OAUTH20_RS ? sections.testConnection : sections.informationProfile;
            case sections.informationProfile:
                return sections.testConnection;
            case sections.testConnection: {
                if (connection.protocol.value !== PROTOCOLS.OAUTH20_RS) {
                    return sections.publish;
                }
                //Stay on this step right after the production request was just made, so the Jira ticket
                //alert can be shown - only advance to customers on the follow-up "Next" click
                const alreadyRequested = connection.status === CONNECTION_STATUSES.PENDING_PROD ||
                    connection.status === CONNECTION_STATUSES.PROD_READY;
                return alreadyRequested ? sections.customers : sections.testConnection;
            }
            case sections.publish:
                return sections.publish;
            case sections.customers:
                return sections.customers;
        }
    }
    const storeAndNext = () => {
        setInitial(false);
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        const isOpen = connection.status === CONNECTION_STATUSES.OPEN;
        let nextSection;
        if (!isOpen && section !== sections.testConnection && section !== sections.publish) {
            nextSection = section;
        } else {
            nextSection = determineNextSection(section);
        }
        const proceed = (section === sections.technical && technicalValid()) ||
            (section === sections.informationProfile && informationProfileValid()) ||
            section === sections.testConnection ||
            section === sections.publish ||
            section === sections.customers;
        if (proceed) {
            setLoading(true);
            const isPendingProdOrProdReady = connection.status === CONNECTION_STATUSES.PENDING_PROD ||
                connection.status === CONNECTION_STATUSES.PROD_READY;
            const isPublishing = (section === sections.publish || (section === sections.testConnection && isRs)) &&
                !isPendingProdOrProdReady;
            const promise = !connection.id ? newConnection : (isPublishing ? updateAndRequestConnectionProductionStatus : updateConnection);
            const body = convertClientConnectionToServer(application, connection, arpInfo);
            if (!sections.allCompleted(body)) {
                sections.complete(body, section);
            }
            if (section === sections.technical && isRs) {
                //Resource servers do not have an informationProfile
                sections.complete(body, sections.informationProfile);
            }
            if (isOpen && nextSection === sections.testConnection) {
                if (isOidc || isRs) {
                    body.metaData.entityID = generateOIDCClientID();
                }
                body.status = CONNECTION_STATUSES.COMPLETE;
            }
            promise(body)
                .then(res => {
                    setInitial(true);
                    setDirty(true);
                    setFlash(I18n.t(`connection.flash.${connection.id ? "updated" : "created"}`, {
                        name: connection.name
                    }));
                    const resultFromServer = isPublishing ? res.connection : res;
                    if (isPublishing) {
                        setJiraKey(res.jiraKey);
                    }
                    const convertedConnection = convertServerConnectionToClient(resultFromServer, protocolOptions, profileOptions, arpInfo);
                    setConnection(convertedConnection);
                    updateChangeRequestKeys(convertedConnection);
                    setLoading(false);
                    changeSection(nextSection);
                })
                .catch(() => {
                    setLoading(false);
                    setConfirmation({
                        open: true,
                        action: () => setConfirmation({open: false}),
                        question: I18n.t("error.jiraDown"),
                        okButton: I18n.t("forms.ok")
                    });
                });

        }
    };

    const backToConnections = () => {
        refresh();
        setConnection(null);
        setJiraKey(null);
        navigate(`/connection/allConnections`);
        window.scrollTo({top: 0, behavior: "smooth"});
        changeSection(sections.technical);
    }

    const saveAndPostponePublish = () => {
        setLoading(true);
        const body = convertClientConnectionToServer(application, connection, arpInfo);
        updateConnection(body)
            .then(() => {
                setDirty(true);
                setFlash(I18n.t("connection.flash.updated", {name: connection.name}));
                setLoading(false);
                backToConnections();
            })
            .catch(() => {
                setLoading(false);
            });
    }

    const backToMainOverview = () => {
        refresh();
        setTab("overview");
    }

    const renderInitialConnection = () => {
        const valid = !storeAndNextDisabled();
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        const isComplete = connection.status !== CONNECTION_STATUSES.OPEN;
        const requiresChangeRequest = connection.status === CONNECTION_STATUSES.PROD_READY;
        const showOverviewButton = section === sections.publish && !isEmpty(jiraKey);
        const prodConnection = connection.status === CONNECTION_STATUSES.PROD_READY;
        const pendingProd = connection.status === CONNECTION_STATUSES.PENDING_PROD;
        const submitTxt = (requiresChangeRequest && config.testEnvironment) ? I18n.t("connection.requiresChangeRequest") :
            section === sections.publish ? ((prodConnection || pendingProd) ? I18n.t("connection.save") : I18n.t("connection.productionStatusSection.requestProduction")) :
                section === sections.testConnection ? (isRs ?
                        (pendingProd ? I18n.t("connection.productionStatusSection.nextStep") :
                            prodConnection ? I18n.t("connection.save") : I18n.t("connection.productionStatusSection.requestProduction")) :
                        I18n.t("connection.productionStatusSection.doneAndContinue")) :
                    isComplete ? I18n.t("connection.save") : I18n.t("connection.saveAndNext");
        const cancelTxt = section === sections.publish ?
            ((prodConnection || pendingProd) ? I18n.t("forms.backToConnections") : I18n.t("connection.productionStatusSection.postponePublish")) :
            I18n.t(`forms.${isComplete ? "backToConnections" : "cancel"}`);
        return (
            <>
                <div className="testing-header">
                    <div className="testing-header-info">
                        <h2 className="text-[length:var(--text-xl-font-size)]">
                            {I18n.t(`connection.${isComplete ? "existing" : "new"}Connection`, {name: connection.name})}
                        </h2>
                        <ConnectionStatusBadge connection={connection}/>
                    </div>
                    <div className="ml-auto flex">
                        {!isEmpty(connection.changeRequests) &&
                            <div className="action-button">
                                <Button onClick={() => changeSection(sections.pendingChanges)}>
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.pendingChanges"))}}/>
                                </Button>
                            </div>
                        }
                        {(!isComplete &&
                                (application.connections?.length > 1 ||
                                    (isEmpty(connection.id) && application.connections.length === 1))) &&
                            <div className="copy-connection"
                                 tabIndex={1}
                                 onBlur={() => setTimeout(() => setIsCopyConnectionOpen(false), 475)}
                            >
                                <Button onClick={() => setIsCopyConnectionOpen(!isCopyConnectionOpen)}
                                        variant="secondary">
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.copyConnection"))}}/>
                                    <span data-icon="inline-end"><CaretDown/></span>
                                </Button>
                                {isCopyConnectionOpen &&
                                    <section className="copy-connection-section dropdown-menu">
                                        {application.connections
                                            .filter(conn => conn.id && conn.name !== connection.name)
                                            .map((conn, index) =>
                                                <span key={index}
                                                      onClick={() => copyConnectionData(conn.id)}>{conn.name}</span>)}
                                    </section>}
                            </div>}

                        <Button variant="ghost"
                                onClick={() => doDeleteConnection(true)}>
                            <TrashIcon/><span>{I18n.t("forms.delete")}</span>
                        </Button>
                    </div>

                </div>
                <div className="testing">
                    <section className="left">
                        <div className="status-menu">
                            {Object.values(sections)
                                .filter(s => typeof s !== "function")
                                .filter(s => connection.protocol.value !== PROTOCOLS.OAUTH20_RS || s !== sections.publish)
                                .filter(s => connection.protocol.value !== PROTOCOLS.OAUTH20_RS || s !== sections.informationProfile)
                                .filter(s => connection.protocol.value === PROTOCOLS.OAUTH20_RS || s !== sections.customers)
                                .filter(s => s !== sections.pendingChanges || !isEmpty(connection.changeRequests))
                                .map(sectionValue => {
                                    const isPublishOrTestAndPublishStep = (sectionValue === sections.publish && !isRs) ||
                                        (sectionValue === sections.testConnection && isRs);
                                    const CustomIcon = (isPublishOrTestAndPublishStep && connection.status === CONNECTION_STATUSES.PENDING_PROD) ?
                                        PendingProdIcon : null;
                                    return <StatusMenuItem key={sectionValue}
                                                           pending={isPending(sectionValue)}
                                                           hideIcon={connection.status !== CONNECTION_STATUSES.OPEN && sectionValue !== sections.pendingChanges}
                                                           disabled={isDisabled(sectionValue)}
                                                           isAlert={sectionValue === sections.pendingChanges}
                                                           action={() => changeSection(sectionValue)}
                                                           info={I18n.t(`connection.${sectionValue === sections.testConnection && isRs ? "testAndPublish" : sectionValue}`)}
                                                           CustomIcon={CustomIcon}
                                                           active={section === sectionValue}/>;
                                })}
                        </div>
                    </section>
                    <section className="right">
                        {renderSection()}
                        {section !== sections.pendingChanges &&
                            <div className={`actions ${showOverviewButton ? "orphan" : ""}`}>
                                {!showOverviewButton &&
                                    <>
                                        <div className="sub-actions">
                                            <Button variant="outline"
                                                    onClick={section === sections.publish ? saveAndPostponePublish : backToConnections}>
                                                <span dangerouslySetInnerHTML={{
                                                    __html: sanitize(cancelTxt)
                                                }}/>
                                            </Button>
                                        </div>
                                        <Button disabled={!valid}
                                                onClick={() => storeAndNext()}>
                                            <span dangerouslySetInnerHTML={{__html: sanitize(submitTxt)}}/>
                                        </Button>
                                    </>
                                }

                                {showOverviewButton &&
                                    <Button variant="outline"
                                            onClick={backToMainOverview}>
                                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.overview"))}}/>
                                        <span data-icon="inline-end"><ArrowRight/></span>
                                    </Button>
                                }
                            </div>}

                    </section>
                </div>
            </>);
    }

    const updateChangeRequestKeys = (convertedConnection, queryParameters = "") => {
        if (!isEmpty(convertedConnection.changeRequests)) {
            const newChangeRequestKeys = [...new Set(convertedConnection.changeRequests
                .flatMap(changeRequest => Object.keys(changeRequest)))];
            setChangeRequestsKeys(newChangeRequestKeys);
            return sections.pendingChanges;
        }
        return queryParameters.indexOf("activate") > 1 ? sections.publish : sections.technical;
    }

    const showConnectionDetails = (conn, queryParameters = "") => {
        navigate(`/connection/${application.id}/allConnections/${conn.id}${queryParameters}`);
        const section = updateChangeRequestKeys(conn, queryParameters);
        setConnection(conn);
        changeSection(section);
    }

    const renderConnectionsTable = (connections) => {
        const columns = [
            {
                key: "name",
                header: I18n.t("connection.connections.name"),
                className: "cut-of-line",
                mapper: conn => conn.name
            },
            {
                key: "protocol",
                header: I18n.t("connection.connections.protocol"),
                mapper: conn => I18n.t(`connection.${conn.protocol.value.toLowerCase()}`)
            },
            {
                key: "status",
                header: I18n.t("connection.connections.status"),
                mapper: conn => <ConnectionStatusBadge connection={conn}/>
            },
            {
                key: "updatedAt",
                header: I18n.t("connection.connections.updatedAt"),
                mapper: conn => dateFromEpoch(conn.updatedAt, true, false)
            },
            {
                key: "details",
                header: "",
                nonSortable: true,
                mapper: () => <ArrowRightIcon/>
            },
        ]
        return (
            <Entities entities={connections}
                      modelName="table-connections"
                      defaultSort="name"
                      columns={columns}
                      title={I18n.t(`connection.allConnections`)}
                      newLabel={I18n.t("testing.newConnection")}
                      showNew={true}
                      newEntityFunc={() => {
                          setSection(sections.technical);
                          setChangeRequestsKeys([]);
                          initConnection(true);
                      }}
                      rowLinkMapper={(e, conn) => showConnectionDetails(conn)}
                      rowHrefMapper={conn => `/connection/${application.id}/allConnections/${conn.id}`}
                      displaySearch={true}
                      searchAttributes={["name", "protocol"]}
                      inputFocus={true}/>
        )

    };

    const renderConnections = () => {
        return (
            <div className="connections">
                {<ConnectionAlert application={application}
                                  user={user}
                                  setTab={setTab}
                                  fullWidth={true}
                                  currentOrganization={currentOrganization}
                                  customProdTabAction={() => showConnectionDetails(connections
                                      .find(conn => conn.status === CONNECTION_STATUSES.COMPLETE), "?action=activate")}
                                  connectionComplete={connectionComplete}
                                  appInformationComplete={appInformationComplete}
                                  connectionNeedsApproval={connectionNeedsApproval}
                />}
                {isEmpty(connections) &&
                    <div className="header">
                        <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t(`connection.allConnections`)}</h3>
                        <Button variant="default"
                                onClick={() => {
                                    setSection(sections.technical);
                                    setChangeRequestsKeys([]);
                                    initConnection(true);
                                }}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("testing.newConnection"))}}/>
                        </Button>
                    </div>}
                {!isEmpty(connections) && renderConnectionsTable(connections)}
                {isEmpty(connections) &&
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("testing.zeroState",
                            {
                                name: application.name
                            }))
                    }}/>}
            </div>
        );

    };
    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }
    const showInitialConnection = (isEmpty(connections) || connection?.new || connection?.id)
        && !isEmpty(connection);
    const {open, cancel, action, modal, okButton, question, header, outstandingPolicies, policyWriteAccess} = confirmation;
    return (
        <div className="testing-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={header}
                                         confirmationTxt={okButton}
                                         question={question}
                                         isDeleteAction={modal === modals.deletionWarning}
                                         children={outstandingPolicies ?
                                             <p dangerouslySetInnerHTML={{
                                                 __html: DOMPurify.sanitize(
                                                     I18n.t(`connection.${policyWriteAccess ? "policyWriteAccess" : "outstandingPolicies"}`),
                                                     {ADD_ATTR: ["href"], ADD_TAGS: ["a"]})
                                             }}/> :
                                             modal === modals.resetSecretDisclaimer ?
                                                 alertInfo(I18n.t("connection.connectionOverview.secretResetDisclaimer"), null, null, null, "error") :
                                                 modal === modals.resetSecret ?
                                                     <div>
                                                         {alertInfo(I18n.t("connection.connectionOverview.disclaimer"), null, null, null, "warning")}
                                                         <InputField name={I18n.t("connection.connectionOverview.secret")}
                                                                     value={connection.secret}
                                                                     disabled={true}
                                                                     copyClipBoard={true}/>

                                                     </div> :
                                                     modal === modals.deletionWarning ?
                                                         <ConnectionInUseWarning identityProviders={affectedIdentityProviders}
                                                                                 unit={units.connection}
                                                                                 applicationName={application.name}/> : null
                                         }
            />}
            {showInitialConnection ? renderInitialConnection() : renderConnections()}
        </div>
    )
}
