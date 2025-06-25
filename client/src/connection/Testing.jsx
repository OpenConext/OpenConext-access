import "./Testing.scss";
import React, {Fragment, useMemo, useRef, useState} from "react";
import I18n from "../locale/I18n";
import {
    Alert,
    AlertType,
    Button,
    ButtonType,
    Checkbox,
    Chip,
    ChipType,
    Loader,
    RadioOptions,
    RadioOptionsOrientation,
    Switch,
    Tooltip
} from "@surfnet/sds";
import CloseIcon from "@surfnet/sds/icons/functional-icons/close.svg";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import CaretDown from "../icons/caret_down.svg";
import {isValidUrl, validUrlRegExp} from "../validations/regExps.js";
import {
    deleteConnectionById,
    getConnectionById,
    newConnection,
    parseMedaData,
    parseMedaDataUrl,
    providersByEntityId,
    resetConnectionSecret,
    updateConnection
} from "../api/index.js";
import UploadButton from "../components/UploadButton.jsx";
import {useAppStore} from "../stores/AppStore.js";
import DOMPurify from "dompurify";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {
    convertClientConnectionToServer,
    convertServerConnectionToClient,
    generateOIDCClientID
} from "../utils/Connection.js";
import {ENVIRONMENTS, identityProviderOption, identityProviderOptions, PROTOCOLS, CONNECTION_STATUSES} from "../utils/Manage.js";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";


const sections = {
    technical: "technical",
    informationProfile: "informationProfile",
    testIdP: "testIdP",
    overview: "overview"
}

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
    resetSecret: "resetSecret"
}

export const Testing = ({
                            application,
                            connection,
                            setConnection,
                            initConnection,
                            refresh,
                            protocolOptions,
                            arpInfo,
                            profileOptions,
                            identityProviders,
                            isProduction
                        }) => {
    const {setFlash, config} = useAppStore(state => state);

    const [isCopyConnectionOpen, setIsCopyConnectionOpen] = useState(false);
    const [section, setSection] = useState(sections.technical);
    const [finishedSections, setFinishedSections] = useState([]);
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

    const connections = useMemo(() => application.connections
            .filter(conn => isProduction ? conn.environment === ENVIRONMENTS.PROD : conn.environment === ENVIRONMENTS.TEST),
        [application, isProduction]);

    const redirectUrlRefs = useRef([]);
    const acsLocationRefs = useRef([]);

    const isPending = sectionName => {
        if (connection.status === CONNECTION_STATUSES.COMPLETE) {
            return false;
        }
        const finished = finishedSections.includes(sectionName);
        switch (sectionName) {
            case sections.technical: {
                return !connection.id;
            }
            case sections.informationProfile: {
                return !connection.id || (!finished || !informationProfileValid());
            }
            case sections.testIdP: {
                return !connection.id || (!finished || !testIdPValid());
            }
        }
    }

    const isDisabled = sectionName => {
        const validCurrentSection = section === sections.technical ? technicalValid() :
            section === sections.informationProfile ? informationProfileValid() : testIdPValid();
        const sectionIsCurrent = sectionName === section;
        return !validCurrentSection && !sectionIsCurrent
    }

    const copyConnectionData = connectionId => {
        setLoading(true);
        getConnectionById(connectionId).then(res => {
            const convertedConnection = convertServerConnectionToClient(res, protocolOptions, profileOptions, arpInfo);
            const originalName = convertedConnection.name;
            convertedConnection.name = "";
            //Filter out all unknown entityIDs
            convertedConnection.allowedEntities = convertedConnection.allowedEntities
                .filter(entityID => identityProviders.some(idp => idp.data.entityid === entityID));
            //This must also work for already persisted connections
            convertedConnection.id = connection.id;
            convertedConnection.environment = isProduction ? ENVIRONMENTS.PROD : ENVIRONMENTS.TEST
            convertedConnection.status = CONNECTION_STATUSES.OPEN;
            convertedConnection.entityID = "";
            setConnection(convertedConnection);
            setLoading(false);
            setFlash(I18n.t("connection.flash.copied", {name: originalName}))
        })

    }

    const isDuplicateConnectionName = () => {
        const nbr = application.connections.filter(conn => conn.name === connection.name).length;
        return connection.id ? nbr > 1 : nbr === 1;
    }

    const technicalValid = () => {
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        return !(duplicateEntityID || isEmpty(connection.name) || (isEmpty(connection.entityID) && !isOidc) || isDuplicateConnectionName() ||
            Object.values(invalidRedirects).some(invalid => invalid) ||
            Object.values(invalidACSLocations).some(invalid => invalid) ||
            (isOidc && (isEmpty(connection.grantTypes) || isEmpty(connection.redirectUrls.filter(url => !isEmpty(url.trim()))))) ||
            (!isOidc && isEmpty(connection.acsLocations.filter(url => !isEmpty(url.trim())))));
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

    const testIdPValid = () => {
        return !isEmpty(connection.allowedEntities);
    }

    const changeSection = sectionName => {
        setSection(sectionName);
    }

    const callSurf = () => {
        const link = document.createElement("a");
        link.href = I18n.t("connection.mailToSurf");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const resetMetaData = () => {
        setFileName(null);
        setShowImport(false);
        setXmlMetaData(null)
        setUrlMetaData(null);
        setMetaDataChoice(metaData.url);
    }

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
        } else {
            setConnection({
                ...connection, protocol: option,
                grantTypes: null,
                pkce: false,
                entityID: "",
                redirectUrls: null,
                acsLocations: [""]
            })
        }
    }

    const doDeleteConnection = confirmationRequired => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                header: I18n.t("forms.delete"),
                question: I18n.t("connection.deleteConfirmation"),
                action: () => doDeleteConnection(false),
                modal: null,
                okButton: I18n.t("forms.delete")
            });
        } else {
            setLoading(true);
            deleteConnectionById(connection.id).then(() => {
                refresh();
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
        providersByEntityId(connection.environment, e.target.value).then(res => {
            const duplicated = (connection.status === CONNECTION_STATUSES.COMPLETE && res.length > 1) ||
                (connection.status === CONNECTION_STATUSES.OPEN && res.length > 0)
            setDuplicateEntityID(duplicated);
        });
    };

    const renderTechnicalSection = () => {
        return (
            <section className="inner-right">
                <h3>{I18n.t("connection.technical")}</h3>
                <InputField value={connection.name || ""}
                            onChange={e => setConnection({...connection, name: e.target.value})}
                            name={I18n.t("connection.connectionName")}
                            required={true}
                            placeholder={I18n.t("connection.connectionPlaceholder",
                                {
                                    application: application.name,
                                    environment: connection.environment.toUpperCase()
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
                             onChange={changeProtocol}
                />
                {connection.protocol.value === PROTOCOLS.OIDC10_RP &&
                    <>
                        <div>
                            <span className="label">{I18n.t("connection.grantTypes")}</span>
                            <div className="grant-types">
                                {Object.keys(grantTypes).map(grantType =>
                                    <Fragment key={grantType}>
                                        <section className="grant-type">
                                            <span>{I18n.t(`connection.${grantType}`)}</span>
                                            <Switch name={grantType}
                                                    value={connection.grantTypes.includes(grantTypes[grantType])}
                                                    onChange={val => grantTypeChanged(grantTypes[grantType], val)}/>
                                        </section>
                                        {(grantType === grantTypes.authorization_code && connection.grantTypes.includes(grantTypes[grantType])) &&
                                            <section key="pkce" className="grant-type pkce">
                                                <span className="pkce-label">{I18n.t("connection.pkce")}</span>
                                                <Tooltip tip={I18n.t("connection.pkceTooltip")}/>
                                                <RadioOptions name="pkce"
                                                              value={connection.pkce}
                                                              trueLabel={I18n.t("connection.required")}
                                                              falseLabel={I18n.t("connection.optional")}
                                                              onChange={() => setConnection({
                                                                  ...connection,
                                                                  pkce: !connection.pkce
                                                              })}/>

                                            </section>
                                        }
                                    </Fragment>)}
                                {(!initial && isEmpty(connection.grantTypes)) &&
                                    <ErrorIndicator
                                        msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.grantType")})}
                                        adjustMargin={true}/>}
                            </div>
                        </div>
                        <div className="redirect-urls-container">
                            <span className="label">{I18n.t("connection.redirectUrls")}</span>
                            <div className="redirect-urls">
                                {connection.redirectUrls.map((value, index) =>
                                    <div className="redirect-url" key={index}>
                                        <div className="redirect-url-inner">
                                            <InputField value={value}
                                                        onChange={e => redirectUrlValueChanged(e, index)}
                                                        onBlur={e => redirectUrlValueBlurred(e, index)}
                                                        onRef={el => redirectUrlRefs.current[index] = el}
                                            />
                                            <Button type={ButtonType.Delete} onClick={() => removeRedirectURL(index)}/>
                                        </div>
                                        {invalidRedirects[index.toString()] &&
                                            <ErrorIndicator msg={I18n.t("forms.invalidURL",
                                                {name: I18n.t("connection.redirectUrl")})}
                                            />
                                        }
                                    </div>
                                )}
                            </div>
                            <Tooltip tip={I18n.t("connection.sslGradeTooltip")}
                                     standalone={true}
                                     children={<a href="/add" className="add-link"
                                                  onClick={e => addRedirectURL(e)}>{I18n.t("connection.addRedirectUrl")}</a>}
                            />
                        </div>
                        {(!initial && isEmpty(connection.redirectUrls.filter(redirectUrl => !isEmpty(redirectUrl.trim())))) &&
                            <ErrorIndicator msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.redirectUrl")})}
                                            adjustMargin={true}/>}
                        {connection.status === CONNECTION_STATUSES.COMPLETE &&
                            <div className="oidc-authentication">
                                <h3>{I18n.t("connection.connectionOverview.authentication")}</h3>
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
                                        <span>{I18n.t("connection.connectionOverview.secretReset")}</span>
                                        <a href="/" onClick={e => newClientSecret(e, true)}>
                                            {I18n.t("connection.connectionOverview.secretResetLink")}
                                        </a>
                                    </div>

                                </div>
                            </div>
                        }
                    </>
                }
                {connection.protocol.value === PROTOCOLS.SAML20_SP &&
                    <>
                        <div className="import-metadata">
                            <h2>{I18n.t("connection.configuration")}</h2>
                            {!showImport && <Button txt={I18n.t("connection.import")}
                                                    type={ButtonType.Secondary}
                                                    onClick={() => setShowImport(true)}
                            />}
                        </div>
                        {showImport &&
                            <div className="show-import">
                                <div className="show-import-header">
                                    <p>{I18n.t("connection.metadata.how")}</p>
                                    <CloseIcon onClick={() => setShowImport(false)}/>

                                </div>
                                <RadioOptions name={"how"}
                                              value={metaDataChoice}
                                              onChange={e => setMetaDataChoice(e.target.id.replace("how_", ""))}
                                              isMultiple={true}
                                              labels={Object.values(metaData)}
                                              labelResolver={label => I18n.t(`connection.metadata.${label}`)}
                                              orientation={RadioOptionsOrientation.column}/>
                                {metaDataChoice === metaData.url && <>
                                    <span className="label top">{I18n.t("connection.metadata.urlMetaData")}</span>
                                    <div className="meta-data-url">
                                        <InputField value={urlMetaData}
                                                    onChange={e => setUrlMetaData(e.target.value)}/>
                                        <Button txt={I18n.t("connection.metadata.import")}
                                                onClick={() => doParseMedaData()}
                                                type={validUrlRegExp.test(urlMetaData) ? ButtonType.Primary : ButtonType.Secondary}
                                                disabled={!validUrlRegExp.test(urlMetaData)}/>
                                    </div>
                                </>}
                                {metaDataChoice === metaData.file && <div className="meta-data-file">
                                    {fileName && <>
                                        <div className="file-name-section">
                                            <span>{fileName}</span>
                                            <Button type={ButtonType.Delete}
                                                    onClick={() => setFileName(null)}/>
                                        </div>
                                        <Button txt={I18n.t("connection.metadata.import")}
                                                onClick={() => doParseMedaData()}
                                                type={ButtonType.Primary}
                                                disabled={false}/>
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
                                        <Button txt={I18n.t("connection.metadata.import")}
                                                onClick={() => doParseMedaData()}
                                                type={!isEmpty(xmlMetaData) ? ButtonType.Primary : ButtonType.Secondary}
                                                disabled={isEmpty(xmlMetaData)}/>
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
                                            <Button type={ButtonType.Delete} onClick={() => removeACSLocation(index)}/>
                                        </div>
                                        {invalidACSLocations[index.toString()] &&
                                            <ErrorIndicator msg={I18n.t("forms.invalidURL",
                                                {name: I18n.t("connection.acsLocation")})}
                                            />
                                        }
                                    </div>
                                )}
                            </div>
                            <Tooltip tip={I18n.t("connection.sslGradeTooltip")}
                                     standalone={true}
                                     children={<a href="/add" className="add-link"
                                                  onClick={e => addACSLocation(e)}>{I18n.t("connection.addACSLocation")}</a>}
                            />
                        </div>
                        {(!initial && isEmpty(connection.acsLocations.filter(acsLocation => !isEmpty(acsLocation.trim())))) &&
                            <ErrorIndicator msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.acsLocation")})}
                                            adjustMargin={true}/>}

                    </>
                }
            </section>
        );
    }

    const changeAllowedTestEntity = (idp, e) => {
        const checked = e.target.checked;
        const allowedEntities = connection.allowedEntities || [];
        if (checked) {
            setConnection({...connection, allowedEntities: [...allowedEntities, idp.entityid]})
        } else {
            setConnection({
                ...connection,
                allowedEntities: [...allowedEntities.filter(entityid => entityid !== idp.entityid)]
            })
        }
    };

    const changeAllowedEntity = options => {
        const iDps = I18n.translations[I18n.locale].connection.testIdPs.identityProviders;
        const allowedEntities = connection.allowedEntities || [];
        const testEntityIdentifiers = iDps.map(idp => idp.entityid)
            .filter(entityID => allowedEntities.includes(entityID));

        setConnection({
            ...connection,
            allowedEntities: options.map(option => option.value).concat(testEntityIdentifiers)
        });
    };

    const renderTestIdPSection = () => {
        const iDps = I18n.translations[I18n.locale].connection.testIdPs.identityProviders;
        const allowedEntities = connection.allowedEntities || [];
        const testEntityIdentifiers = iDps.map(idp => idp.entityid);
        return (
            <section className="inner-right-idp">
                <h3>{I18n.t("connection.testIdP")}</h3>
                <p>{I18n.t("connection.testIdPs.info")}</p>
                <h3>{I18n.t("connection.testIdPs.subTitle")}</h3>
                <section className="identity-providers">
                    {iDps.map((idp, index) =>
                        <div key={index} className="idp">
                            <Checkbox name={idp.name}
                                      value={allowedEntities.includes(idp.entityid)}
                                      onChange={e => changeAllowedTestEntity(idp, e)}/>
                            <div className="idp-info">
                                <p dangerouslySetInnerHTML={{__html: idp.name}}/>
                                <p dangerouslySetInnerHTML={{__html: idp.description}}/>
                            </div>
                        </div>
                    )}
                </section>
                <h3>{I18n.t("connection.testIdPs.institutionIdPs")}</h3>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.testIdPs.institutionIdPsInfo"))}}/>
                <SelectField
                    options={identityProviderOptions(identityProviders.filter(idp => !allowedEntities.includes(idp.data.entityid)), I18n.locale)}
                    value={allowedEntities
                        .filter(entityID => !testEntityIdentifiers.includes(entityID))
                        .map(entityId => identityProviderOption(identityProviders, entityId, I18n.locale))}
                    isMulti={true}
                    searchable={true}
                    placeholder={I18n.t("connection.testIdPs.placeholder")}
                    onChange={options => changeAllowedEntity(options)}
                />
                {(!initial && isEmpty(connection.allowedEntities)) &&
                    <ErrorIndicator
                        msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.testIdPs.institution")})}
                    />}

            </section>
        );
    }

    const renderVisibilitySection = () => {
        const allowedEntities = connection.allowedEntities || [];
        return (
            <section className="inner-right-idp">
                <h3>{I18n.t("connection.visibility")}</h3>
                <p>{I18n.t("connection.visibilities.info")}</p>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("connection.visibilities.institutionIdPsInfo"))}}/>
                <SelectField
                    options={identityProviderOptions(identityProviders.filter(idp => !allowedEntities.includes(idp.data.entityid)), I18n.locale)}
                    value={allowedEntities
                        .map(entityId => identityProviderOption(identityProviders, entityId, I18n.locale))}
                    isMulti={true}
                    searchable={true}
                    placeholder={I18n.t("connection.testIdPs.placeholder")}
                    onChange={options => changeAllowedEntity(options)}
                />
                {(!initial && isEmpty(connection.allowedEntities)) &&
                    <ErrorIndicator
                        msg={I18n.t("forms.requiredOne", {name: I18n.t("connection.visibilities.institution")})}
                    />}

            </section>
        );
    }

    const renderOverview = () => {
        return (
            <section className="inner-right-overview">
                <h3>{I18n.t("connection.connectionOverview.copy")}</h3>
                <Alert alertType={AlertType.Warning}
                       asChild={true}
                       message={I18n.t("connection.connectionOverview.disclaimer")}/>
                <p className="test"
                   dangerouslySetInnerHTML={{
                       __html: DOMPurify.sanitize(I18n.t("connection.connectionOverview.test",
                           {ADD_ATTR: ["target"]}))
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
                            value={connection.secret}
                            disabled={true}
                            copyClipBoard={true}/>
            </section>
        )
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
        setConnection({...connection, profile: option, profileMotivation: ""})
    }

    const renderInformationProfileSection = () => {
        const profileName = connection.profile?.value || arpInfo.profiles[0].name;
        const profileInfo = I18n.translations[I18n.locale].connection.informational.profiles[profileName].info;
        const currentProfile = arpInfo.profiles.find(profile => profile.name === profileName);
        const isContentApp = application.type === "CONTENT"
        return (
            <section className="inner-right-informational">
                <h3>{I18n.t("connection.informationProfile")}</h3>
                {isContentApp && <Alert alertType={AlertType.Warning}
                                        asChild={true}
                                        message={I18n.t("connection.informational.contentAppAlert")}/>
                }
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
                    {currentProfile.attributes.map((attribute, index) =>
                        <Fragment key={index}>
                            <span>{attribute}</span><span>{arpInfo.attributes.find(attr => attr.name === attribute).example}</span></Fragment>
                    )}
                </div>
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
                                    value={showAdditionalAttributes || !isEmpty(connection.additionalAttributes)}
                                    onChange={toggleAdditionalAttributes}/>
                        </section>
                        {(showAdditionalAttributes || !isEmpty(connection.additionalAttributes)) && <>
                            <p className="available-attributes">{I18n.t("connection.informational.availableAttributes")}</p>
                            {currentProfile.optionalAttributes.map((optionalAttribute, index) => {
                                const selected = connection.additionalAttributes.includes(optionalAttribute);
                                return (
                                    <div key={index}
                                         className={`additional-attributes optional ${!selected ? "dormant" : ""}`}>
                                        <section className="optional-attribute">
                                            <div className="additional-attribute-info">
                                                <span>{optionalAttribute}</span>
                                                <span>{arpInfo.attributes.find(attr => attr.name === optionalAttribute).info[I18n.locale]}</span>
                                            </div>
                                            <Switch name={`extraAttribute_${index}`}
                                                    value={selected}
                                                    onChange={val => changeAdditionalAttributes(optionalAttribute, val)}/>
                                        </section>
                                        {selected &&
                                            <InputField value={connection.motivations[optionalAttribute]}
                                                        name={I18n.t("connection.informational.motivation")}
                                                        placeholder={I18n.t("connection.informational.motivationPlaceholder")}
                                                        onChange={e => changeMotivation(e, optionalAttribute)}
                                                        multiline={true}/>
                                        }
                                        {(!initial && selected && isEmpty(connection.motivations[optionalAttribute])) &&
                                            <ErrorIndicator
                                                msg={I18n.t("forms.required", {name: I18n.t("connection.informational.motivation")})}
                                            />}

                                    </div>
                                )
                            })}
                        </>}

                    </>}

            </section>
        );
    }

    const renderSection = () => {
        switch (section) {
            case sections.technical: {
                return renderTechnicalSection();
            }
            case sections.informationProfile: {
                return renderInformationProfileSection();
            }
            case sections.testIdP: {
                return isProduction ? renderVisibilitySection() : renderTestIdPSection();
            }
            case sections.overview: {
                return renderOverview();
            }
        }
    }

    const storeAndNextDisabled = () => {
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
            case sections.testIdP: {
                return !testIdPValid();
            }
        }

    }

    const storeAndNext = (finished = false) => {
        setInitial(false);
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const isComplete = connection.status === CONNECTION_STATUSES.COMPLETE;
        const nextSection = isComplete ? section : section === sections.technical ? sections.informationProfile :
            section === sections.informationProfile ? sections.testIdP :
                (section === sections.testIdP && isOidc && !isComplete) ? sections.overview : sections.testIdP;
        const proceed = (section === sections.technical && technicalValid()) ||
            (section === sections.informationProfile && informationProfileValid()) ||
            (section === sections.testIdP && testIdPValid());
        if (proceed) {
            setLoading(true);
            const promise = connection.id ? updateConnection : newConnection
            const body = convertClientConnectionToServer(application, connection, arpInfo);
            if (finished && !isComplete) {
                if (isOidc) {
                    body.metaData.entityID = generateOIDCClientID();
                }
                body.status = CONNECTION_STATUSES.COMPLETE;
            }
            promise(body)
                .then(res => {
                    setFinishedSections([...finishedSections, section]);
                    setLoading(false);
                    setInitial(true);
                    setFlash(I18n.t(`connection.flash.${connection.id ? "updated" : "created"}`, {
                        name: connection.name
                    }));
                    setConnection(convertServerConnectionToClient(res, protocolOptions, profileOptions, arpInfo));
                    changeSection(nextSection);
                })
                .catch(() => {
                    setLoading(false);
                    setFlash(I18n.t("forms.error"), "error")
                });

        }
    };

    const backToConnections = () => {
        refresh();
        setSection(sections.technical);
    }

    const renderInitialConnection = () => {
        const isOidc = connection.protocol.value === PROTOCOLS.OIDC10_RP;
        const lastSection = section === sections.testIdP;
        const valid = !storeAndNextDisabled();
        const isComplete = connection.status === CONNECTION_STATUSES.COMPLETE;
        const showOverviewButton = section === sections.overview || (isComplete && section === sections.testIdP && !isOidc);
        const submitTxt = (isComplete || (lastSection && !isOidc)) ? I18n.t("connection.save") : I18n.t("connection.saveAndNext");
        const {open, cancel, action, modal, okButton, question, header} = confirmation;
        return <>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={header}
                                         confirmationTxt={okButton}
                                         question={question}
                                         children={modal === modals.resetSecretDisclaimer ?
                                             <Alert alertType={AlertType.Error}
                                                    asChild={true}
                                                    message={I18n.t("connection.connectionOverview.secretResetDisclaimer")}/> :
                                             modal === modals.resetSecret ?
                                                 <div>
                                                     <Alert alertType={AlertType.Warning}
                                                            asChild={true}
                                                            message={I18n.t("connection.connectionOverview.disclaimer")}/>
                                                     <InputField name={I18n.t("connection.connectionOverview.secret")}
                                                                 value={connection.secret}
                                                                 disabled={true}
                                                                 copyClipBoard={true}/>

                                                 </div> : null
                                         }
            />}
            <div className="testing-header">
                <h2>{I18n.t(`connection.${isComplete ? "existing" : "new"}Connection${isProduction ? "Prod" : ""}`)}</h2>
                {(!isEmpty(application.connections) &&
                        (application.connections.length > 1 ||
                            (isEmpty(connection.id) && application.connections.length === 1))) &&
                    <div className="copy-connection"
                         tabIndex={1}
                         onBlur={() => setTimeout(() => setIsCopyConnectionOpen(false), 475)}>
                        <Button onClick={() => setIsCopyConnectionOpen(!isCopyConnectionOpen)}
                                txt={I18n.t("connection.copyConnection")}
                                icon={<CaretDown/>}
                                type={ButtonType.Secondary}/>
                        {isCopyConnectionOpen &&
                            <section className="copy-connection-section sds--user-info--dropdown">
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
                            .map(sectionValue =>
                                <StatusMenuItem key={sectionValue}
                                                pending={isPending(sectionValue)}
                                                disabled={isDisabled(sectionValue)}
                                                action={() => changeSection(sectionValue)}
                                                info={I18n.t(`connection.${(sectionValue !== sections.testIdP || !isProduction) ? sectionValue : "visibility"}`)}
                                                active={section === sectionValue}/>)}
                    </div>
                    <div className="call-for-action">
                        <p>{I18n.t("connection.help")}</p>
                        <Button txt={I18n.t("connection.callSurf")}
                                type={ButtonType.Secondary}
                                onClick={() => callSurf()}/>
                    </div>
                    <div className="delete-connection">
                        <Button type={ButtonType.Delete} onClick={() => doDeleteConnection(true)}/>
                    </div>
                </section>
                <section className="right">
                    {renderSection()}
                    <div className={`actions ${showOverviewButton ? "orphan" : ""}`}>
                        {!showOverviewButton &&
                            <>
                                <Button txt={I18n.t(`forms.${connection.id ? "backToOverview" : "cancel"}`)}
                                        type={ButtonType.Secondary}
                                        onClick={backToConnections}/>
                                <Button txt={submitTxt}
                                        disabled={!valid}
                                        onClick={() => storeAndNext(lastSection)}/>
                            </>
                        }

                        {showOverviewButton &&
                            <Button txt={I18n.t("forms.overview")}
                                    type={ButtonType.Secondary}
                                    icon={<ArrowRight/>}
                                    onClick={() => backToConnections()}/>
                        }
                    </div>

                </section>
            </div>
        </>;
    }

    const showConnectionDetails = conn => {
        if (conn.status === CONNECTION_STATUSES.COMPLETE) {
            setLoading(true);
            getConnectionById(conn.id).then(res => {
                const convertedConnection = convertServerConnectionToClient(res, protocolOptions, profileOptions, arpInfo);
                setConnection(convertedConnection);
                setLoading(false);
            })
        } else {
            //Not yet persisted to Manage
            setConnection(conn);
        }

    }

    const renderConnectionsTable = (connections) => {
        const columns = [
            {
                key: "name",
                header: I18n.t("connection.connections.name"),
                mapper: conn => conn.name
            },
            {
                key: "createdAt",
                header: I18n.t("connection.connections.created"),
                mapper: conn => dateFromEpoch(conn.createdAt)
            },
            {
                key: "status",
                header: I18n.t("connection.connections.status"),
                mapper: conn => {
                    const type = conn.status === "OPEN" ? ChipType.Status_warning : ChipType.Support_400;
                    return <Chip type={type}
                                 label={I18n.t(`connection.connections.${conn.status.toLowerCase()}`)}/>
                }
            },
            {
                key: "protocol",
                header: I18n.t("connection.connections.protocol"),
                mapper: conn => I18n.t(`connection.${conn.protocol.value.toLowerCase()}`)
            },
            {
                key: "details",
                header: "",
                nonSortable: true,
                mapper: conn => <Button txt={I18n.t("connection.connections.details")}
                                        onClick={() => showConnectionDetails(conn)}/>
            },
        ]

        return (
            <Entities entities={connections}
                      modelName="table-connections"
                      defaultSort="name"
                      columns={columns}
                      hideTitle={true}
                      showNew={false}
                      displaySearch={false}
                      searchAttributes={["name", "protocol"]}
                      inputFocus={true}>
            </Entities>)

    };

    const renderConnections = () => {
        return (
            <div className="connections">
                <div className="header">
                    <h3>{I18n.t("connection.test.connections")}</h3>
                    <Button txt={I18n.t("testing.newConnection")}
                            type={ButtonType.Secondary}
                            onClick={() => initConnection(isProduction ? ENVIRONMENTS.PROD : ENVIRONMENTS.TEST, true)}/>
                </div>
                {!isEmpty(connections) && renderConnectionsTable(connections)}
                {isEmpty(connections) &&
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("testing.zeroState",
                            {
                                name: application.name,
                                type: I18n.t(`testing.${isProduction ? "production" : "test"}`)
                            }))
                    }}/>}
            </div>
        );

    };
    if (loading) {
        return <Loader/>
    }
    const showInitialConnection = (isEmpty(connections) || connection?.new || connection?.id)
        && !isEmpty(connection);
    return (
        <div className="testing-container">
            {showInitialConnection ? renderInitialConnection() : renderConnections()}
        </div>
    )
}
