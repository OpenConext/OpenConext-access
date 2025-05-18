import "./Testing.scss";
import React, {useRef, useState} from "react";
import I18n from "../locale/I18n";
import {Button, ButtonType, RadioOptions, RadioOptionsOrientation, Switch, Tooltip} from "@surfnet/sds";
import CloseIcon from "@surfnet/sds/icons/functional-icons/close.svg";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import CaretDown from "../icons/caret_down.svg";
import {validUrlRegExp} from "../validations/regExps.js";
import {parseMedaData} from "../api/index.js";
import UploadButton from "../components/UploadButton.jsx";

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

const protocolOptions = ["oidc10rp", "saml20sp"].map(protocol => ({
    value: protocol,
    label: I18n.t(`connection.${protocol}`)
}));

const grantTypes = {
    authorization_code: "authorization_code",
    refresh_token: "refresh_token",
    device_code: "urn:ietf:params:oauth:grant-type:device_code"
}

export const Testing = ({application}) => {

    const [isCopyConnectionOpen, setIsCopyConnectionOpen] = useState(false);
    const [section, setSection] = useState(sections.technical);
    const [connection, setConnection] = useState({
        environment: "test",
        protocol: protocolOptions[0],
        grantTypes: ["authorization_code"],
        pkce: true,
        redirectUrls: [""],
        acsLocations: [""],
        metaData: {}
    });
    const [visitedSections, setVisitedSections] = useState(new Set());
    const [invalidRedirects, setInvalidRedirects] = useState({"0": false});
    const [showImport, setShowImport] = useState(false);
    const [metaDataChoice, setMetaDataChoice] = useState("url");
    const [urlMetaData, setUrlMetaData] = useState("");
    const [fileName, setFileName] = useState(null);

    const redirectUrlRefs = useRef([]);
    const acsLocationRefs = useRef([]);

    const isPending = sectionName => {
        const visited = visitedSections.has(sectionName);
        switch (sectionName) {
            case sections.technical: {
                return !visited || isEmpty(connection.name) || Object.values(invalidRedirects).some(invalid => invalid);
            }
            case sections.testIdP: {
                return !visited;
            }
            case sections.informationProfile: {
                return true;
            }
        }
    }

    const changeSection = sectionName => {
        setSection(sectionName);
        setVisitedSections(new Set([...visitedSections, sectionName]));
    }

    const callSurf = () => {
        const link = document.createElement("a");
        link.href = I18n.t("connection.mailToSurf");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        parseMedaData(urlMetaData).then(res => {
            //TODO, display all results?
        })
    }
    const onFileRemoval = index => e => {
        stopEvent(e);
        setFileName(null);
        setConnection({...connection, metaData: {}});
    };

    const onFileUpload = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const xml = reader.result.toString();
                setFileName(file.name);
                doParseMedaData();
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
                <SelectField name={I18n.t("connection.protocol")}
                             value={connection.protocol}
                             options={protocolOptions}
                             onChange={option => setConnection({...connection, protocol: option})}
                />
                {connection.protocol.value === "oidc10rp" &&
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
                    </>}
                {connection.protocol.value === "saml20sp" &&
                    <>
                        <div className="import-metadata">
                            <h2>{I18n.t("connection.configuration")}</h2>
                            {!showImport && <Button txt={I18n.t("connection.import")}
                                                    type={ButtonType.Secondary}
                                                    onClick={() => setShowImport(true)}
                            />}
                        </div>
                        {showImport && <div className="show-import">
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
                                            onClick={() => doParseMedaData(metaData.url)}
                                            type={validUrlRegExp.test(urlMetaData) ? ButtonType.Primary : ButtonType.Secondary}
                                            disabled={!validUrlRegExp.test(urlMetaData)}/>
                                </div>
                            </>}
                            {metaDataChoice === metaData.file &&
                                <div className="meta-data-file">
                                <UploadButton name={"meta-date-file"}
                                              acceptFileFormat={".xml"}
                                              txt={I18n.t("connection.metadata.chooseFile")}
                                              onFileUpload={onFileUpload}/>
                                </div>}

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

                    </>}
            </>
        );
    }

    const testIdPSection = () => {
        return (
            <span>testIdPSection</span>
        );
    }

    const informationProfileSection = () => {
        return (
            <span>informationProfileSection</span>
        );
    }

    const getSection = () => {
        switch (section) {
            case sections.technical: {
                return technicalSection();
            }
            case sections.testIdP: {
                return testIdPSection();
            }
            case sections.informationProfile: {
                return informationProfileSection();
            }
            default: {
                throw new Error(`Unknown section ${section}`)
            }
        }
    }

    return (
        <div className="testing-container">
            <div className="testing-header">
                <h2>{I18n.t("connection.newConnection")}</h2>
                <div className="copy-connection"
                     tabIndex={1}
                     onBlur={() => setTimeout(() => setIsCopyConnectionOpen(false), 475)}
                >
                    <Button onClick={() => setIsCopyConnectionOpen(!isCopyConnectionOpen)}
                            txt={I18n.t("connection.copyConnection")}
                            icon={<CaretDown/>}
                            type={ButtonType.Secondary}/>
                    {isCopyConnectionOpen &&
                        <section className="copy-connection-section sds--user-info--dropdown">
                            {application.connections.map(conn =>
                                <span onClick={() => alert("TODO")}>{conn.name}</span>)}
                        </section>}
                </div>
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
                                    onClick={() => changeSection(section === sections.technical ? sections.informationProfile : sections.testIdP)}
                            />
                        </div>
                    }    </section>
            </div>
        </div>
    )
}
