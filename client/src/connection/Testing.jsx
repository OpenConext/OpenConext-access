import "./Testing.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Button, ButtonType, RadioOptions, Switch} from "@surfnet/sds";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";

const sections = {
    technical: "technical",
    informationProfile: "informationProfile",
    testIdP: "testIdP"
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
        pkce: true
    });

    const isPending = sectionName => {
        //TODO
        return true;
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

    return (
        <div className="testing-container">
            <div className="testing-header"
                 tabIndex={1}
                 onBlur={() => setTimeout(() => setIsCopyConnectionOpen(false), 475)}>
                <h2>{I18n.t("connection.newConnection")}</h2>
                <Button onClick={() => setIsCopyConnectionOpen(!isCopyConnectionOpen)}
                        txt={I18n.t("connection.copyConnection")}
                        type={ButtonType.Secondary}/>
            </div>
            <div className="testing">
                <section className="left">
                    <div className="status-menu">
                        {Object.values(sections).map(sectionValue =>
                            <StatusMenuItem key={sectionValue}
                                            pending={isPending(sectionValue)}
                                            action={() => setSection(sectionValue)}
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
                                            <RadioOptions name="pkce"
                                                          value={connection.pkce}
                                                          trueLabel={I18n.t("connection.optional")}
                                                          falseLabel={I18n.t("connection.required")}
                                                          onChange={() => setConnection({...connection, pkce: !connection.pkce})}/>

                                        </section>
                                    }
                                </>)}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
