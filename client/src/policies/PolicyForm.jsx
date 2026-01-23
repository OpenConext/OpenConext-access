import "./PolicyForm.scss";
import React, {useEffect, useState} from "react";
import {Button, ButtonType, SegmentedControl, Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import InputField from "../components/InputField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import {allowedAttributes, newPolicy, updatePolicy} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import SelectField from "../components/SelectField.jsx";


export const PolicyForm = ({backToAccess, policy, setPolicy}) => {

    const [allAllowedAttributes, setAllAllowedAttributes] = useState(null);
    const [initial, setInitial] = useState(true);

    const required = ["name", "denyAdvice", "denyAdviceNl"];

    const {setFlash} = useAppStore(useShallow(state => ({
        setFlash: state.setFlash
    })));

    useEffect(() => {
        allowedAttributes()
            .then(res => {
                setAllAllowedAttributes(res);
            })
    }, []);

    const isValid = () => {
        return required.every(attr => !isEmpty(policy[attr]));
    }

    const submit = () => {
        setInitial(false);
        if (isValid()) {
            const promise = policy.id ? updatePolicy : newPolicy;
            promise(policy).then(res => {
                setPolicy(res);
                setFlash(I18n.t(`appAccess.flash.${policy.id ? "updated" : "created"}`, {name: res.name}));
            })
        }
    }

    return (
        <div className="policy-form-container">
            <div className="policy-form">
                <InputField name={I18n.t("appAccess.targetGroup")}
                            value={policy.name}
                            required={true}
                            error={!initial && isEmpty(policy.name)}
                            placeholder={I18n.t("appAccess.placeholderTargetGroup")}
                            onChange={e => setPolicy({...policy, name: e.target.value})}
                />
                {(!initial && isEmpty(policy.name)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("appAccess.targetGroup")})}/>}
                <div className="row">
                    <div className="row-item">
                        <span className="label standalone">{I18n.t("appAccess.allowDeny")}
                            <Tooltip tip={I18n.t("appAccess.denyRuleTooltip")}/>
                        </span>
                        <SegmentedControl onClick={val => setPolicy({...policy, denyRule: val === "deny"})}
                                          option={policy.denyRule ? "deny" : "allow"}
                                          options={["deny", "allow"]}
                                          optionLabelResolver={option => I18n.t(`appAccess.${option}`)}/>
                    </div>
                    <div className="row-item">
                        <span className="label standalone">{I18n.t("appAccess.allAttributesMatch")}
                            <Tooltip tip={I18n.t("appAccess.allAttributesMatchTooltip")}/>
                        </span>
                        <SegmentedControl onClick={val => setPolicy({...policy, allAttributesMustMatch: val === "all"})}
                                          option={policy.allAttributesMustMatch ? "all" : "any"}
                                          options={["all", "any"]}
                                          optionLabelResolver={option => I18n.t(`appAccess.${option}`)}/>
                    </div>
                </div>
                <span className="label standalone">{I18n.t("appAccess.filters")}</span>
                <div className="filters">
                    {policy.attributes.map((attribute, index) =>
                        <div key={index} className="attribute">
                            <SelectField name={I18n.t("appAccess.attribute")}
                                         placeholder={I18n.t("appAccess.attributePlaceholder")}
                                         value={attribute.name}
                                         required={true}
                                         onChange={val => {
                                             console.log("attribute  " + JSON.stringify(val))
                                         }}
                                         options={allAllowedAttributes}/>
                            <SelectField name={I18n.t("appAccess.permittedValues")}
                                         value={attribute.value}
                                         creatable={true}
                                         required={true}
                                         error={!initial && isEmpty(attribute.value)}
                                         placeholder={I18n.t("appAccess.permittedValuesPlaceholder")}
                                         onChange={e => console.log("value" + JSON.stringify(e))}
                            />
                        </div>)}

                </div>
                <InputField name={I18n.t("appAccess.denyEn")}
                            value={policy.denyAdvice}
                            required={true}
                            error={!initial && isEmpty(policy.denyAdvice)}
                            placeholder={I18n.t("appAccess.denyPlaceholder")}
                            onChange={e => setPolicy({...policy, denyAdvice: e.target.value})}
                />
                {(!initial && isEmpty(policy.denyAdvice)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("appAccess.denyEn")})}/>}

                <InputField name={I18n.t("appAccess.denyNl")}
                            value={policy.denyAdviceNl}
                            required={true}
                            error={!initial && isEmpty(policy.denyAdviceNl)}
                            placeholder={I18n.t("appAccess.denyPlaceholder")}
                            onChange={e => setPolicy({...policy, denyAdviceNl: e.target.value})}
                />
                {(!initial && isEmpty(policy.denyAdviceNl)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("appAccess.denyNl")})}/>}

            </div>
            <div className="actions">
                <Button type={ButtonType.Secondary}
                        onClick={() => backToAccess(true)}
                        txt={I18n.t("forms.cancel")}/>
                <Button type={ButtonType.Primary}
                        onClick={() => submit()}
                        disabled={!initial && !isValid()}
                        txt={I18n.t(`appAccess.${policy.id ? "submitExisting" : "submitNew"}`)}/>
            </div>
        </div>
    );
}
