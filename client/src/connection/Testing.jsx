import "./Testing.scss";
import React, {useRef, useState} from "react";
import I18n from "../locale/I18n";
import {
    Button,
    ButtonType,
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
import {validUrlRegExp} from "../validations/regExps.js";
import {newConnection, parseMedaData, parseMedaDataUrl, updateConnection} from "../api/index.js";
import UploadButton from "../components/UploadButton.jsx";
import Select from 'react-select';
import {useAppStore} from "../stores/AppStore.js";
import DOMPurify from "dompurify";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";

const sections = {
    technical: "technical",
    informationProfile: "informationProfile",
    testIdP: "testIdP"
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

export const Testing = ({application, connection, setConnection, initConnection, protocolOptions}) => {
    const {setFlash} = useAppStore(state => state);

    const [isCopyConnectionOpen, setIsCopyConnectionOpen] = useState(false);
    const [section, setSection] = useState(sections.technical);
    const [visitedSections, setVisitedSections] = useState(new Set());
    const [invalidRedirects, setInvalidRedirects] = useState({"0": false});
    const [invalidACSLocations, setInvalidACSLocations] = useState({"0": false});
    const [showImport, setShowImport] = useState(false);
    const [metaDataChoice, setMetaDataChoice] = useState(metaData.url);
    const [xmlMetaData, setXmlMetaData] = useState(null);
    const [urlMetaData, setUrlMetaData] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [initial, setInitial] = useState(true);
    const [loading, setLoading] = useState(false);

    const redirectUrlRefs = useRef([]);
    const acsLocationRefs = useRef([]);

    const isPending = sectionName => {
        const visited = visitedSections.has(sectionName);
        switch (sectionName) {
            case sections.technical: {
                return !visited || !technicalValid();
            }
            case sections.informationProfile: {
                return true;
            }
            case sections.testIdP: {
                return !visited;
            }
        }
    }

    const technicalValid = () => {
        return !(isEmpty(connection.name) ||
            Object.values(invalidRedirects).some(invalid => invalid) ||
            Object.values(invalidACSLocations).some(invalid => invalid));

    }

    const informationProfileValid = () => {
        return true;
    }

    const testIdPValid = () => {
        return true;
    }

    const changeSection = sectionName => {
        setVisitedSections(new Set([...visitedSections, section]));
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
    }

    const doParseMedaData = () => {
        const promise = metaDataChoice === metaData.url ? parseMedaDataUrl(urlMetaData) : parseMedaData(xmlMetaData);
        promise.then(res => {
            setShowImport(false);
            const newConnection = {...connection, ...res[0]}
            setConnection(newConnection);
            setXmlMetaData(null);
            setUrlMetaData(null);
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

    const technicalSection = () => {
        return (
            <>
                <h2>{I18n.t("connection.technical")}</h2>
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

                <SelectField name={I18n.t("connection.protocol")}
                             value={connection.protocol}
                             options={protocolOptions}
                             onChange={option => setConnection({...connection, protocol: option})}
                />
                {connection.protocol.value === "OIDC" &&
                    <>
                        <div>
                            <span className="label">{I18n.t("connection.grantTypes")}</span>
                            <div className="grant-types">
                                {Object.keys(grantTypes).map(grantType =>
                                    <>
                                        <section key={grantType} className="grant-type">
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
                                                              trueLabel={I18n.t("connection.optional")}
                                                              falseLabel={I18n.t("connection.required")}
                                                              onChange={() => setConnection({
                                                                  ...connection,
                                                                  pkce: !connection.pkce
                                                              })}/>

                                            </section>
                                        }
                                    </>)}
                            </div>
                        </div>
                        <div className="redirect-urls-container">
                            <span className="label">{I18n.t("connection.redirectUrls")}</span>
                            <div className="redirect-urls">
                                {connection.redirectUrls.map((value, index) =>
                                    <div className="redirect-url" key={index}>
                                        <InputField value={value}
                                                    onChange={e => redirectUrlValueChanged(e, index)}
                                                    onRef={el => redirectUrlRefs.current[index] = el}
                                        />
                                        <Button type={ButtonType.Delete} onClick={() => removeRedirectURL(index)}/>
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

                    </>}
                {connection.protocol.value === "SAML" &&
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
                                    onChange={e => setConnection({...connection, entityID: e.target.value})}
                                    name={I18n.t("connection.entityID")}
                                    required={true}
                                    placeholder={I18n.t("connection.entityIDPlaceHolder")}
                        />
                        <div className="acs-locations-container">
                            <span className="label">{I18n.t("connection.acsLocations")}</span>
                            <div className="acs-locations">
                                {connection.acsLocations.map((value, index) =>
                                    <div className="acs-location" key={index}>
                                        <InputField value={value}
                                                    onChange={e => acsLocationChanged(e, index)}
                                                    onRef={el => acsLocationRefs.current[index] = el}
                                        />
                                        <Button type={ButtonType.Delete} onClick={() => removeACSLocation(index)}/>
                                    </div>
                                )}
                            </div>
                            <Tooltip tip={I18n.t("connection.sslGradeTooltip")}
                                     standalone={true}
                                     children={<a href="/add" className="add-link"
                                                  onClick={e => addACSLocation(e)}>{I18n.t("connection.addACSLocation")}</a>}
                            />
                        </div>

                    </>
                }
            </>
        )
            ;
    }

    const testIdPSection = () => {
        return (
            <span>testIdPSection</span>
        );
    }

    const informationProfileSection = () => {
        const options = [
            {
                value: 'option1',
                label: (
                    <div>
                        <b>Bold Text</b>
                        <br/>
                        Subtitle or Description
                    </div>
                ),
            },
            {
                value: 'option2',
                label: (
                    <div>
                        <b>Another Bold</b>
                        <br/>
                        More details
                    </div>
                ),
            },
        ];
        return (<>
                <span>informationProfileSection</span>
                <Select
                    options={options}
                    // If you want to also customize how the selected value is shown:
                    formatOptionLabel={({label}) => label}
                />
            </>
        );
    }

    const getSection = () => {
        switch (section) {
            case sections.technical: {
                return technicalSection();
            }
            case sections.informationProfile: {
                return informationProfileSection();
            }
            case sections.testIdP: {
                return testIdPSection();
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

    const storeAndNext = () => {
        setInitial(false);
        if (section === sections.technical && technicalValid()) {
            setLoading(true);
            const promise = connection.id ? updateConnection : newConnection
            promise({...connection, application: {id: application.id}})
                .then(res => {
                    setLoading(false);
                    setConnection(res);
                    setFlash(I18n.t("connection.flash.created"));
                    changeSection(sections.informationProfile);
                })

        } else if (section === sections.informationProfile && informationProfileValid())
            if (technicalValid()) {
                changeSection(section === sections.technical ? sections.informationProfile : sections.testIdP);
            }

    };


    const renderInitialConnection = () => {
        return <>
            <div className="testing-header">
                <h2>{I18n.t("connection.newConnection")}</h2>
                {(!isEmpty(application.connections) && application.connections.length > 1) &&
                    <div className="copy-connection"
                         tabIndex={1}
                         onBlur={() => setTimeout(() => setIsCopyConnectionOpen(false), 475)}>
                        <Button onClick={() => setIsCopyConnectionOpen(!isCopyConnectionOpen)}
                                txt={I18n.t("connection.copyConnection")}
                                icon={<CaretDown/>}
                                type={ButtonType.Secondary}/>
                        {isCopyConnectionOpen &&
                            <section className="copy-connection-section sds--user-info--dropdown">
                                {application.connections.map((conn, index) =>
                                    <span key={index} onClick={() => alert("TODO")}>{conn.name}</span>)}
                            </section>}
                    </div>}
            </div>
            <div className="testing">
                <section className="left">
                    <div className="status-menu">
                        {Object.values(sections).map(sectionValue =>
                            <StatusMenuItem key={sectionValue}
                                            pending={isPending(sectionValue)}
                                            action={() => changeSection(sectionValue)}
                                            info={I18n.t(`connection.${sectionValue}`)}
                                            active={section === sectionValue}/>)}
                    </div>
                    <div className="call-for-action">
                        <p>{I18n.t("connection.help")}</p>
                        <Button txt={I18n.t("connection.callSurf")}
                                type={ButtonType.Secondary}
                                onClick={() => callSurf()}/>
                    </div>
                </section>
                <section className="right">
                    <section className="inner-right">
                        {getSection()}
                    </section>
                    {(section === sections.technical || section === sections.informationProfile) &&
                        <div className="actions">
                            <Button txt={I18n.t("connection.next")}
                                    type={ButtonType.secondary}
                                    disabled={storeAndNextDisabled()}
                                    onClick={() => storeAndNext()}
                            />
                        </div>
                    }
                </section>
            </div>
        </>;
    }

    const renderConnectionsTable = () => {
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
                    const type = conn.status === "OPEN" ? ChipType.Status_success : ChipType.Main_400;
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
                                              onClick={() => {
                                                  setConnection(conn);
                                              }}/>
            },
        ]

        return (
            <Entities entities={application.connections}
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
                            onClick={() => initConnection(true)}/>
                </div>
                {!isEmpty(application.connections) && renderConnectionsTable()}
                {isEmpty(application.connections) &&
                    <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("testing.zeroState", {name: application.name}))}}/>}
            </div>


        );

    };
    if (loading) {
        return <Loader/>
    }
    const showInitialConnection = (isEmpty(application.connections) || connection?.new || connection?.id)
        && !isEmpty(connection);
    return (
        <div className="testing-container">
            {showInitialConnection ? renderInitialConnection() : renderConnections()}
        </div>
    )
}
