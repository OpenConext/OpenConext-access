import "./ApplicationForm.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import InputField from "../components/InputField.jsx";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";
import {Button, ButtonType, RadioOptions, RadioOptionsOrientation, Tooltip} from "@surfnet/sds";
import InfoIcon from "@surfnet/sds/icons/functional-icons/info.svg";
import {CollapseField} from "../components/CollapseField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {organizationById} from "../api/index.js";

export const ApplicationForm = () => {

    const {organisationId, id} = useParams();
    const navigate = useNavigate();
    const [isNew, setIsNew] = useState(true);
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState({type: "app", target: "surf"});
    const [checks, setChecks] = useState({});

    useEffect(() => {
        organizationById(organisationId).then(res => {
                setIsNew(id === "new");
                const newChecks = {};
                const translationChecks = I18n.translations[I18n.locale]["application"]["checks"];
                Object.keys(translationChecks).forEach(check => newChecks[check] = false);
                setChecks(newChecks);
                useAppStore.setState({
                    organization: res,
                    breadcrumbPath: [
                        {path: "/home", value: I18n.t("breadCrumb.access")},
                        {path: `/organization/${res.id}`, value: res.name},
                        {value: I18n.t("breadCrumb.applications")}
                    ]
                });
                setLoading(false);
            }
        )
    }, [id, organisationId]);

    const targetGroupLabel = label => {
        const upperText = I18n.t(`application.target${label.toUpperCase()}`);
        const bottomText = I18n.t(`application.target${label.toUpperCase()}Info`);
        return `<div><p class="primary-label-radio-option">${upperText}</p><p>${bottomText}</p></div>`
    }

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="application-form-container">
            <div className="application-form">
                <h2>{I18n.t(`application.${isNew ? "new" : "edit"}`, {name: application.name})}</h2>
                <InputField name={I18n.t("application.name")}
                            value={application.name || ""}
                            required={true}
                            onChange={e => setApplication({...application, name: e.target.value})}
                            info={I18n.t("application.nameInfo")}/>
                <RadioOptions label={I18n.t("application.type")}
                              name={"type"}
                              value={application.type}
                              onChange={e => setApplication({...application, type: e.target.id.replace("type_", "")})}
                              isMultiple={true}
                              labels={["app", "content"]}
                              labelResolver={label => I18n.t(`application.${label}`)}
                              orientation={RadioOptionsOrientation.column}/>
                {application.type === "content" &&
                    <div className="sds--alert sds--alert--status-info">
                        <div className="sds--alert--inner">
                            <div className="sds--alert--visual">
                                <InfoIcon/>
                            </div>
                            <div>
                                <span>{I18n.t("application.contentInfoPre")}</span>
                                <Tooltip tip={I18n.t("application.contentInfoTip")}
                                         standalone={true}
                                         children={
                                             <span className="link">{I18n.t("application.contentInfoLink")}</span>}
                                />
                                <span>{I18n.t("application.contentInfoPost")}</span>
                            </div>
                        </div>
                    </div>
                }
                <RadioOptions label={I18n.t("application.targetGroup")}
                              name={"target"}
                              value={application.target}
                              onChange={e => setApplication({
                                  ...application,
                                  target: e.target.id.replace("target_", "").toLowerCase()
                              })}
                              isMultiple={true}
                              labels={["surf", "sram"]}
                              labelResolver={targetGroupLabel}
                              orientation={RadioOptionsOrientation.column}/>
                {isNew &&
                    <div className="fair-use-terms">
                        <span className="label">{I18n.t("application.terms")}<sup className="required">*</sup></span>
                        {Object.keys(checks).map(check =>
                            <CollapseField title={I18n.t(`application.checks.${check}`)}
                                           name={check}
                                           checkRequired={e => setChecks({...checks, [check]: e.target.checked})}
                                           checkValue={checks[check]}>
                                <span>{I18n.t(`application.checksInfo.${check}`)}</span>
                            </CollapseField>)}
                    </div>}
                <section className="actions">
                    <Button onClick={() => navigate("/home")}
                            type={ButtonType.Secondary}
                            txt={I18n.t("forms.cancel")}/>
                    <Button onClick={() => alert("todo")}
                            txt={I18n.t("forms.submit")}
                            disabled={(isNew && Object.values(checks).some(check => !check)) || isEmpty(application.name)}/>
                </section>
            </div>
        </div>
    )
}
