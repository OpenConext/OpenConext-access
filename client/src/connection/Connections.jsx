import "./Connections.scss";
import React, {Fragment, useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import {Alert, AlertDescription, Button, RadioGroup, RadioGroupItem, Spinner, Switch, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {Chip, ChipType} from "../components/Chip.jsx";
import {
    InfoIcon,
    TrashIcon,
    WarningIcon,
    XCircleIcon,
    CaretRightIcon as ArrowRightIcon,
    CaretDownIcon as CaretDown
} from "@phosphor-icons/react";
import "jsondiffpatch/formatters/styles/html.css";

import {XIcon as CloseIcon} from "@phosphor-icons/react";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {isEmpty, stopEvent, sanitize} from "../utils/Utils.js";
import {isValidUrl, validUrlRegExp} from "../validations/regExps.js";
import {
    deleteConnectionById,
    getConnectionById,
    identityProvidersByUsedConnection,
    newConnection,
    parseMedaData,
    parseMedaDataUrl,
    policiesByServiceProviders,
    resetConnectionSecret,
    uniqueEntityID,
    updateConnection,
    uppdateAndRequestConnectionProductionStatus
} from "../api/index.js";
import UploadButton from "../components/UploadButton.jsx";
import {useAppStore} from "../stores/AppStore.js";
import DOMPurify from "dompurify";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {connectOptions, convertClientConnectionToServer, convertServerConnectionToClient, generateOIDCClientID, sections, visibilities} from "../utils/Connection.js";
import {CONNECTION_STATUSES, PROTOCOLS, STATE} from "../utils/Manage.js";
import {ArrowRightIcon as ArrowRight} from "@phosphor-icons/react";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import SwitchField from "../components/SwitchField.jsx";
import {useNavigate} from "react-router";
import {ConnectionAlert} from "./ConnectionAlert.jsx";
import {createAndClickLink, domainName} from "../utils/Forms.js";
import {ChangeRequests} from "./ChangeRequests.jsx";
import {useShallow} from "zustand/react/shallow";
import {ConnectionInUseWarning, units} from "./ConnectionInUseWarning.jsx";
import {hasPolicyWriteAccess, policyServiceProvider} from "../utils/Permissions.js";
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

const AlertTriangleIcon = () => <WarningIcon weight="fill" className="alert-triangle"/>;

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
    const [initial, setInitial] = useState(true);
    const [showAdditionalAttributes, setShowAdditionalAttributes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [changeRequestsKeys, setChangeRequestsKeys] = useState([]);
    const [affectedIdentityProviders, setAffectedIdentityProviders] = useState([]);
    const [jiraKey, setJiraKey] = useState(null);
    const [proceedWithProduction, setProceedWithProduction] = useState(false);

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

    const isPending = sectionName => {
        return !sections.isComplete(connection, sectionName);
    }

    const isDisabled = sectionName => {
        switch (sectionName) {
            case sections.technical: {
                return false;
            }
            case sections.informationProfile: {
                return !sections.isComplete(connection, sections.technical) || !technicalValid();
            }
            case sections.productionStatus: {
                return !sections.isComplete(connection, sections.informationProfile) || !technicalValid();
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

    const technicalValid = () => {
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isSaml = connection.protocol.value === PROTOCOLS.SAML20_SP;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        return !(duplicateEntityID || isEmpty(connection.name) || (isEmpty(connection.entityID) && !isOidc && !isRs) ||
            isDuplicateConnectionName() ||
            Object.values(invalidRedirects).some(invalid => invalid) ||
            (!isRs && (isEmpty(connection.loginUrl) || invalidLoginUrl)) ||
            Object.values(invalidACSLocations).some(invalid => invalid) ||
            (isOidc && (isEmpty(connection.grantTypes) || isEmpty(connection.redirectUrls.filter(url => !isEmpty(url.trim()))))) ||
            (isSaml && !isEmpty(connection.acsLocations.filter(url => !isEmpty(url.trim())))));
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

    const renderRadioOptions = (name, value, labels, labelResolver, onChange, orientation = "column") => (
        <RadioGroup value={value}
                    onValueChange={onChange}
                    className={`radio-options-group ${orientation}`}>
            {labels.map(label =>
                <div className="radio-item" key={`${name}_${label}`}>
                    <RadioGroupItem value={label} id={`${name}_${label}`}/>
                    <label htmlFor={`${name}_${label}`}>{labelResolver(label)}</label>
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
        if (confirmationRequired) {
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
                                 options={scopes.map(scope => ({label: scope.name, value: scope.name}))}
                                 value={connection.scopes}
                                 isMulti={true}
                                 searchable={true}
                                 creatable={true}
                                 placeholder={I18n.t("connection.scopePlaceholder")}
                                 onChange={options => setConnection({...connection, scopes: options})}
                                 info={I18n.t("connection.scopeInfo")}
                    />}

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
                                {Object.keys(grantTypes).map(grantType =>
                                    <Fragment key={grantType}>
                                        <section className="grant-type">
                                            <span>{I18n.t(`connection.${grantType}`)}</span>
                                            <Switch name={grantType}
                                                    checked={connection.grantTypes.includes(grantTypes[grantType])}
                                                    onCheckedChange={val => grantTypeChanged(grantTypes[grantType], val)}/>
                                        </section>
                                        {(grantType === grantTypes.authorization_code && connection.grantTypes.includes(grantTypes[grantType])) &&
                                            <section key="pkce" className="grant-type pkce">
                                                <span className="pkce-label">{I18n.t("connection.pkce")}</span>
                                                <Tooltip>
                                                    <TooltipTrigger render={<InfoIcon/>}/>
                                                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.pkceTooltip"))}}/></TooltipContent>
                                                </Tooltip>
                                                {renderRadioOptions("pkce", connection.pkce ? "true" : "false",
                                                    ["false", "true"],
                                                    label => label === "true" ? I18n.t("connection.required") : I18n.t("connection.optional"),
                                                    () => setConnection({
                                                        ...connection,
                                                        pkce: !connection.pkce
                                                    }), "row")}

                                            </section>
                                        }
                                        {(grantType === grantTypes.refresh_token && connection.grantTypes.includes(grantTypes[grantType])) &&
                                            <>
                                                <section key="refresh_token_validity"
                                                         className="grant-type refresh-token-validity">
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
                                    </Fragment>)}
                                {(!initial && isEmpty(connection.grantTypes)) &&
                                    <ErrorIndicator
                                        msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.grantType")})}
                                        adjustMargin={true}/>}
                            </div>
                        </div>
                        <div className="redirect-urls-container">
                            <span className="label">{I18n.t("connection.redirectUrls")}
                                <sup className="required left-outline">*</sup>
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
                                            <Button variant="destructive" onClick={() => removeRedirectURL(index)}>
                                                <TrashIcon/>
                                            </Button>
                                            <Button onClick={() => createAndClickLink(`https://www.ssllabs.com/ssltest/analyze.html?d=${domainName(value)}`)}>
                                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.testSection"))}}/>
                                            </Button>
                                        </div>
                                        {invalidRedirects[index.toString()] &&
                                            <ErrorIndicator msg={I18n.t("forms.invalidURL",
                                                {name: I18n.t("connection.redirectUrl")})}
                                            />
                                        }
                                    </div>
                                )}
                            </div>
                            <Tooltip>
                                <TooltipTrigger render={<a href="/add" className="add-link"
                                                            onClick={e => addRedirectURL(e)}>{I18n.t("connection.addRedirectUrl")}</a>}/>
                                <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.sslGradeTooltip"))}}/></TooltipContent>
                            </Tooltip>
                        </div>
                        {(!initial && isEmpty(connection.redirectUrls.filter(redirectUrl => !isEmpty(redirectUrl.trim())))) &&
                            <ErrorIndicator msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.redirectUrl")})}
                                            adjustMargin={true}/>}

                        <SwitchField name={"claimsInIdToken"}
                                     isAlert={changeRequestsKeys.includes("claimsInIdToken")}
                                     value={connection.claimsInIdToken || false}
                                     onChange={val => setConnection({...connection, claimsInIdToken: val})}
                                     label={I18n.t("connection.claimsInIdToken")}
                                     info={I18n.t("connection.claimsInIdTokenTooltip")}
                        />
                    </>
                }
                {connection.status !== CONNECTION_STATUSES.OPEN && (connection.protocol.value === PROTOCOLS.OIDC10_RP ||
                        connection.protocol.value === PROTOCOLS.OAUTH20_RS) &&
                    <div className="oidc-authentication">
                        <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.connectionOverview.authentication")}</h3>
                        <div className="oidc-authentication-inner">
                            <InputField name={I18n.t("connection.connectionOverview.discovery")}
                                        value={config.discovery}
                                        disabled={true}
                                        copyClipBoard={true}/>
                            <InputField name={I18n.t("connection.connectionOverview.clientID")}
                                        value={connection.entityID}
                                        disabled={true}
                                        copyClipBoard={true}/>
                            <div className="input-field sds--text-field secret-link">
                                <span className="label">{I18n.t("connection.connectionOverview.secret")}</span>
                                <span>{I18n.t("connection.connectionOverview.secretReset")}
                                    <a href="/" onClick={e => newClientSecret(e, true)}>
                                    {I18n.t("connection.connectionOverview.secretResetLink")}
                                </a>
                                </span>

                            </div>
                        </div>
                    </div>
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
                                            <Button variant="destructive"
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
                            <span className="label">{I18n.t("connection.acsLocations")}</span>
                            <div className="acs-locations">
                                {connection.acsLocations.map((value, index) =>
                                    <div className="acs-location" key={index}>
                                        <div className="acs-location-inner" key={index}>
                                            <InputField value={value}
                                                        onChange={e => acsLocationChanged(e, index)}
                                                        onBlur={e => acsLocationValueBlurred(e, index)}
                                                        onRef={el => acsLocationRefs.current[index] = el}
                                            />
                                            <Button variant="destructive" onClick={() => removeACSLocation(index)}>
                                                <TrashIcon/>
                                            </Button>
                                        </div>
                                        {invalidACSLocations[index.toString()] &&
                                            <ErrorIndicator msg={I18n.t("forms.invalidURL",
                                                {name: I18n.t("connection.acsLocation")})}
                                            />
                                        }
                                    </div>
                                )}
                            </div>
                            <Tooltip>
                                <TooltipTrigger render={<a href="/add" className="add-link"
                                                            onClick={e => addACSLocation(e)}>{I18n.t("connection.addACSLocation")}</a>}/>
                                <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("connection.sslGradeTooltip"))}}/></TooltipContent>
                            </Tooltip>
                        </div>
                        {(!initial && isEmpty(connection.acsLocations.filter(acsLocation => !isEmpty(acsLocation.trim())))) &&
                            <ErrorIndicator msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.acsLocation")})}
                                            adjustMargin={true}/>}
                        {connection.status !== CONNECTION_STATUSES.OPEN &&
                            <div className="oidc-authentication">
                                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.connectionOverview.samlConfig")}</h3>
                                <div className="oidc-authentication-inner">
                                    <InputField name={I18n.t("connection.connectionOverview.idpProxyMetaData")}
                                                value={config.idpProxyMetaData}
                                                disabled={true}
                                                copyClipBoard={true}/>
                                    <p className="saml-test"
                                       dangerouslySetInnerHTML={{
                                           __html: DOMPurify.sanitize(I18n.t("connection.connectionOverview.test")
                                               , {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]})
                                       }}/>
                                </div>
                            </div>
                        }

                    </>
                }
            </section>
        );
    }

    const renderTestIdPSection = () => {
        const iDps = config.identityProviders;
        const allowedEntities = connection.allowedEntities || [];
        const testEntityIdentifiers = iDps.map(idp => idp.entityid);
        const dummyIdpsActive = !isEmpty(connection.allowedEntities)
        return (
            <section className="test-idp-section">
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

    const renderProductionStatusSection = () => {
        const pendingProd = connection.status === CONNECTION_STATUSES.PENDING_PROD;
        const prodConnection = connection.status === CONNECTION_STATUSES.PROD_READY;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        return (
            <section className="inner-right">
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.productionStatus")}</h3>
                {prodConnection && <p>{I18n.t("connection.productionStatusReady")}</p>}
                {!isEmpty(jiraKey) && renderProductionStatusRequested(false)}
                {(!pendingProd && !prodConnection) &&
                    <div className="visibility-options">
                        <p className="question">{I18n.t("connection.productionStatusSection.proceedHow")}</p>
                        {renderRadioOptions("proceedWithProduction",
                            proceedWithProduction ? "prodConnection" : "testConnection",
                            ["testConnection", "prodConnection"],
                            label => I18n.t(`connection.productionStatusSection.${label}`),
                            () => setProceedWithProduction(!proceedWithProduction))}
                        {(!appInformationComplete && proceedWithProduction) &&
                            alertInfo(I18n.t("connection.productionStatusSection.appInformationIncomplete"),
                                () => setTab("application"),
                                I18n.t("connection.productionStatusSection.fillAppInformation"),
                                "warning")}
                    </div>}
                {(pendingProd && isEmpty(jiraKey)) &&
                    alertInfo(I18n.t("connection.productionStatusSection.pendingProdDisclaimer"))}
                {(!isRs && ((proceedWithProduction && appInformationComplete) || prodConnection)) &&
                    <>
                        <h4>{I18n.t("connection.production.access")}</h4>
                        <div className="identity-providers">
                            <div className="visibility-options">
                                <p className="question">{I18n.t("connection.visibilities.who")}
                                    {changeRequestsKeys.includes("visibility") && <Tooltip>
                                        <TooltipTrigger render={<WarningIcon weight="fill" className="alert-triangle"/>}/>
                                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                                    </Tooltip>}
                                </p>
                                {renderRadioOptions("visibility", connection.visibility,
                                    [visibilities.visible_to_all, visibilities.visible_to_idp_only, visibilities.visible_to_none],
                                    label => I18n.t(`connection.visibilities.${label}`),
                                    value => setConnection({
                                        ...connection,
                                        visibility: value
                                    }))}
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
                            <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.visibilities.disclaimer"))}}/>
                        </div>
                    </>}
                {(!pendingProd && !prodConnection && !proceedWithProduction && !isRs) && renderTestIdPSection()}
            </section>
        );
    }

    const renderSAMLOverview = () => {
        return (
            <section className="inner-right-overview">
                {!isEmpty(jiraKey) && renderProductionStatusRequested(true)}
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.connectionOverviewSAML.title")}</h3>
                <p className="test"
                   dangerouslySetInnerHTML={{
                       __html: DOMPurify.sanitize(I18n.t("connection.connectionOverviewSAML.link",
                           {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]}))
                   }}/>
            </section>
        )
    }

    const renderOIDCOverview = () => {
        return (
            <section className="inner-right-overview">
                {!isEmpty(jiraKey) && renderProductionStatusRequested(true)}
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.connectionOverview.copy")}</h3>
                {alertInfo(I18n.t("connection.connectionOverview.disclaimer"), null, null, "warning")}
                <p className="test"
                   dangerouslySetInnerHTML={{
                       __html: DOMPurify.sanitize(I18n.t("connection.connectionOverview.test")
                           , {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]})
                   }}/>
                <InputField name={I18n.t("connection.connectionOverview.discovery")}
                            value={config.discovery}
                            disabled={true}
                            copyClipBoard={true}/>
                <InputField name={I18n.t("connection.connectionOverview.clientID")}
                            value={connection.entityID}
                            disabled={true}
                            copyClipBoard={true}/>
                <InputField name={I18n.t("connection.connectionOverview.secret")}
                            value={connection.originalSecret}
                            disabled={true}
                            copyClipBoard={true}/>
            </section>
        )
    }

    const renderProductionStatusRequested = renderHeader => {
        return (
            <div className="production-status-requested">
                {renderHeader && <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.productionStatusRequested.info")}</h3>}
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("connection.connections.requestProductionStatusPostInfo",
                        {jiraKey: jiraKey}))
                }}/>
            </div>
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
                {isContentApp && alertInfo(I18n.t("connection.informational.contentAppAlert"), null, null, "warning")}
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
                                                alertInfo(I18n.t("connection.informational.scopedValueAttributeDisclaimer"), null, null, "warning")
                                            }
                                        </div>
                                    )
                                })}
                            </>}

                    </>}

            </section>
        );
    }

    const alertInfo = (message, action, actionLabel, alertType = "info") => {
        const Icon = alertType === "error" ? XCircleIcon : alertType === "warning" ? WarningIcon : InfoIcon;
        return (
            <Alert variant={alertType === "error" ? "destructive" : "default"}>
                <Icon/>
                <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(message)}}/>
                {action && <button type="button" className="alert-action" onClick={action}>{actionLabel}</button>}
            </Alert>
        )
    }

    const renderSection = () => {
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        switch (section) {
            case sections.technical: {
                return renderTechnicalSection();
            }
            case sections.informationProfile: {
                return renderInformationProfileSection();
            }
            case sections.productionStatus: {
                return renderProductionStatusSection();
            }
            case sections.overview: {
                return isOidc || isRs ? renderOIDCOverview() : renderSAMLOverview();
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
        if (section === sections.productionStatus && proceedWithProduction && !appInformationComplete) {
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
            case sections.productionStatus: {
                return proceedWithProduction && !appInformationComplete;
            }
            case sections.pendingChanges: {
                return false;
            }
        }
    }

    const determineNextSection = currentSection => {
        switch (currentSection) {
            case sections.technical:
                return connection.protocol.value === PROTOCOLS.OAUTH20_RS ? sections.productionStatus : sections.informationProfile;
            case sections.informationProfile:
                return sections.productionStatus;
            default:
                return sections.overview;
        }
    }
    const storeAndNext = (finished = false) => {
        setInitial(false);
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isRs = connection.protocol.value === PROTOCOLS.OAUTH20_RS;
        const isOpen = connection.status === CONNECTION_STATUSES.OPEN;
        let nextSection;
        if (!isOpen) {
            nextSection = section;
        } else {
            nextSection = determineNextSection(section);
        }
        const proceed = (section === sections.technical && technicalValid()) ||
            (section === sections.informationProfile && informationProfileValid()) ||
            section === sections.productionStatus;
        if (proceed) {
            setLoading(true);
            const promise = connection.id ? (proceedWithProduction ? uppdateAndRequestConnectionProductionStatus : updateConnection) : newConnection;
            const body = convertClientConnectionToServer(application, connection, arpInfo);
            if (!sections.allCompleted(body)) {
                sections.complete(body, section);
            }
            if (section === sections.technical && isRs) {
                //Resource servers do not have an informationProfile
                sections.complete(body, sections.informationProfile);
            }
            if (finished && isOpen) {
                if (isOidc || isRs) {
                    body.metaData.entityID = generateOIDCClientID();
                }
                body.status = CONNECTION_STATUSES.COMPLETE;
            }
            promise(body)
                .then(res => {
                    setInitial(true);
                    setDirty(true);
                    setProceedWithProduction(false);
                    setFlash(I18n.t(`connection.flash.${connection.id ? "updated" : "created"}`, {
                        name: connection.name
                    }));
                    const resultFromServer = proceedWithProduction ? res.connection : res;
                    if (proceedWithProduction) {
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

    const backToMainOverview = () => {
        refresh();
        setTab("overview");
    }

    const renderInitialConnection = () => {
        const lastSection = section === sections.productionStatus;
        const valid = !storeAndNextDisabled();
        const isComplete = connection.status !== CONNECTION_STATUSES.OPEN;
        const requiresChangeRequest = connection.status === CONNECTION_STATUSES.PROD_READY;
        const showOverviewButton = section === sections.overview;
        const submitTxt = (requiresChangeRequest && config.testEnvironment) ? I18n.t("connection.requiresChangeRequest") :
            isComplete ? I18n.t("connection.save") : I18n.t("connection.saveAndNext");
        return (
            <>
                <div className="testing-header">
                    <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t(`connection.${isComplete ? "existing" : "new"}Connection`, {name: connection.name})}</h2>
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
                             onBlur={() => setTimeout(() => setIsCopyConnectionOpen(false), 475)}>
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
                </div>
                <div className="testing">
                    <section className="left">
                        <div className="status-menu">
                            {Object.values(sections)
                                .filter(s => s !== sections.overview)
                                .filter(s => typeof s !== "function")
                                .filter(s => connection.protocol.value !== PROTOCOLS.OAUTH20_RS || s !== sections.informationProfile)
                                .filter(s => s !== sections.pendingChanges || !isEmpty(connection.changeRequests))
                                .map(sectionValue =>
                                    <StatusMenuItem key={sectionValue}
                                                    pending={isPending(sectionValue)}
                                                    hideIcon={connection.status !== CONNECTION_STATUSES.OPEN && sectionValue !== sections.pendingChanges}
                                                    disabled={isDisabled(sectionValue)}
                                                    isAlert={sectionValue === sections.pendingChanges}
                                                    action={() => changeSection(sectionValue)}
                                                    info={I18n.t(`connection.${sectionValue}`)}
                                                    CustomIcon={sectionValue === sections.productionStatus && connection.status === CONNECTION_STATUSES.PENDING_PROD ? AlertTriangleIcon : null}
                                                    active={section === sectionValue}/>)}
                        </div>
                    </section>
                    <section className="right">
                        {renderSection()}
                        {section !== sections.pendingChanges &&
                            <div className={`actions ${showOverviewButton ? "orphan" : ""}`}>
                                {!showOverviewButton &&
                                    <>
                                        <div className="sub-actions">
                                            <Button variant="secondary"
                                                    onClick={backToConnections}>
                                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t(`forms.${isComplete ? "backToConnections" : "cancel"}`))}}/>
                                            </Button>
                                            <div className="delete-connection">
                                                <Button variant="destructive"
                                                        onClick={() => doDeleteConnection(true)}>
                                                    <TrashIcon/>
                                                </Button>
                                            </div>
                                        </div>
                                        <Button disabled={!valid}
                                                onClick={() => storeAndNext(lastSection)}>
                                            <span dangerouslySetInnerHTML={{__html: sanitize(submitTxt)}}/>
                                        </Button>
                                    </>
                                }

                                {showOverviewButton &&
                                    <Button variant="secondary"
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
        return queryParameters.indexOf("activate") > 1 ? sections.productionStatus : sections.technical;
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
                mapper: conn => {
                    const productionConnectionNeedsActivation = conn.status === CONNECTION_STATUSES.COMPLETE;
                    const toolTip = null;//I18n.translations[I18n.locale].connection.connections.tooltips[conn.status.toLowerCase()]
                    const status = productionConnectionNeedsActivation ? "ready_for_prod" : !isEmpty(conn.changeRequests) ? "open_change_requests" : conn.status.toLowerCase();
                    return (
                        <div className="status-chip">
                            <Chip type={ChipType.Status_error}
                                  className={status}
                                  label={I18n.t(`connection.connections.${status}`)}
                            >
                                {!isEmpty(conn.changeRequests) ? <WarningIcon weight="fill" className="alert-triangle"/> : null}
                            </Chip>
                            {toolTip && <Tooltip>
                                <TooltipTrigger render={<InfoIcon/>}/>
                                <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(toolTip)}}/></TooltipContent>
                            </Tooltip>}
                        </div>
                    );
                }
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
                      hideTitle={true}
                      showNew={false}
                      rowLinkMapper={(e, conn) => showConnectionDetails(conn)}
                      displaySearch={false}
                      searchAttributes={["name", "protocol"]}
                      inputFocus={true}>
            </Entities>
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
                <div className="header">
                    <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t(`connection.allConnections`)}</h3>
                    <Button variant="secondary"
                            onClick={() => {
                                setSection(sections.technical);
                                setChangeRequestsKeys([]);
                                initConnection(true);
                            }}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("testing.newConnection"))}}/>
                    </Button>
                </div>
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
                                                 alertInfo(I18n.t("connection.connectionOverview.secretResetDisclaimer"), null, null, "error") :
                                                 modal === modals.resetSecret ?
                                                     <div>
                                                         {alertInfo(I18n.t("connection.connectionOverview.disclaimer"), null, null, "warning")}
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
