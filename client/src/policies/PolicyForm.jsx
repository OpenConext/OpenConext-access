import "./PolicyForm.scss";
import React, {useEffect, useState} from "react";
import {Button, ButtonType, SegmentedControl, Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import InputField from "../components/InputField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import {allowedAttributes, newPolicy, uniquePolicyName, updatePolicy} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import SelectField from "../components/SelectField.jsx";
import {defaultAttributes, flatMapByValues} from "../utils/Policy.js";


export const PolicyForm = ({backToAccess, policy, setPolicy, isExistingPolicy, originalName, refreshPolicies}) => {

    const [allAllowedAttributes, setAllAllowedAttributes] = useState([]);
    const [initial, setInitial] = useState(true);
    const [duplicatePolicyName, setDuplicatePolicyName] = useState(false);
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
            const promise = isExistingPolicy ? updatePolicy : newPolicy;
            //We need to destructure the attributes with multiple values, to single attribute / value pairs
            policy.attributes = flatMapByValues(policy.attributes);
            if (!isExistingPolicy) {
                policy.entityid = crypto.randomUUID();
            }
            promise(policy)
                .then(res => {
                    setFlash(I18n.t(`appAccess.flash.${isExistingPolicy ? "updated" : "created"}`, {name: res.name}));
                    refreshPolicies();
                });
        }
    }

    const attributeSelected = (option, index) => {
        const newAttributes = [...policy.attributes];
        newAttributes[index] = {name: option.value, value: []};
        setPolicy({...policy, attributes: newAttributes})
    }

    const attributeDeleted = index => {
        const newAttributes = policy.attributes.filter((item, i) => i !== index);
        setPolicy({...policy, attributes: defaultAttributes(newAttributes)})
    }

    const attributeValueChanged = (value, index) => {
        const newAttributes = [...policy.attributes];
        const attribute = newAttributes[index];
        attribute.value = value;
        setPolicy({...policy, attributes: newAttributes});
    }

    const denyRuleToggle = val => {
        const denyRule = val === "deny";
        const newAttributes = denyRule ? policy.attributes
                .filter(attr => allAllowedAttributes.some(option => option.allowedInDenyRule && option.value === attr.name))
            : [...policy.attributes];
        setPolicy({...policy, denyRule: denyRule, attributes: defaultAttributes(newAttributes)});
    }

    const policyNameChanged = e => {
        const name = e.target.value.trim();
        setPolicy({...policy, name: name});
        setDuplicatePolicyName(false);
    }

    const validatePolicyName = e => {
        const name = e.target.value.trim();
        //empty is handled by required
        if (!isEmpty(name) && name !== originalName) {
            uniquePolicyName(name).then(res => {
                setDuplicatePolicyName(res.length > 0);
            })
        }
    }


    return (
        <div className="policy-form-container">
            <div className="policy-form">
                <InputField name={I18n.t("appAccess.targetGroup")}
                            value={policy.name}
                            required={true}
                            onBlur={validatePolicyName}
                            error={!initial && isEmpty(policy.name) || duplicatePolicyName}
                            placeholder={I18n.t("appAccess.placeholderTargetGroup")}
                            onChange={policyNameChanged}
                />
                {(!initial && isEmpty(policy.name)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.targetGroup")})}/>}
                {duplicatePolicyName &&
                    <ErrorIndicator adjustMargin={true} msg={I18n.t("appAccess.duplicateName", {name: policy.name})}/>}

                <InputField name={I18n.t("appAccess.description")}
                            value={policy.description}
                            required={true}
                            multiline={true}
                            error={!initial && isEmpty(policy.description)}
                            placeholder={I18n.t("appAccess.placeholderDescription")}
                            onChange={e => setPolicy({...policy, description: e.target.value})}
                />
                {(!initial && isEmpty(policy.description)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.description")})}/>}

                <div className="row">
                    <div className="row-item">
                        <span className="label standalone">{I18n.t("appAccess.allowDeny")}
                            <Tooltip tip={I18n.t("appAccess.denyRuleTooltip")}/>
                        </span>
                        <SegmentedControl onClick={val => denyRuleToggle(val)}
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
                    <p>{JSON.stringify(policy.attributes)}</p>
                    {policy.attributes.map((attribute, index) =>
                        <div key={index} className="attribute">
                            <div className="attribute-name-wrapper">
                                <SelectField name={I18n.t("appAccess.attribute")}
                                             placeholder={I18n.t("appAccess.attributePlaceholder")}
                                             value={allAllowedAttributes.find(attr => attr.value === attribute.name)}
                                             required={true}
                                             onChange={option => attributeSelected(option, index)}
                                             options={policy.denyRule ? allAllowedAttributes
                                                 .filter(option => option.allowedInDenyRule) : allAllowedAttributes}/>
                                {(!isEmpty(attribute.name) && !isEmpty(attribute.value)) &&
                                    <Button type={ButtonType.Delete}
                                            onClick={() => attributeDeleted(index)}
                                    />
                                }
                            </div>
                            <SelectField name={I18n.t("appAccess.permittedValues")}
                                         value={attribute.value}
                                         creatable={true}
                                         required={true}
                                         error={!initial && isEmpty(attribute.value)}
                                         placeholder={I18n.t("appAccess.permittedValuesPlaceholder")}
                                         onChange={values => attributeValueChanged(values, index)}
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
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.denyEn")})}/>}

                <InputField name={I18n.t("appAccess.denyNl")}
                            value={policy.denyAdviceNl}
                            required={true}
                            error={!initial && isEmpty(policy.denyAdviceNl)}
                            placeholder={I18n.t("appAccess.denyPlaceholder")}
                            onChange={e => setPolicy({...policy, denyAdviceNl: e.target.value})}
                />
                {(!initial && isEmpty(policy.denyAdviceNl)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.denyNl")})}/>}

            </div>
            <div className="actions">
                <Button type={ButtonType.Secondary}
                        onClick={() => backToAccess(true)}
                        txt={I18n.t("forms.cancel")}/>
                <Button type={ButtonType.Primary}
                        onClick={() => submit()}
                        disabled={!initial && !isValid()}
                        txt={I18n.t(`appAccess.${isExistingPolicy ? "submitExisting" : "submitNew"}`)}/>
            </div>
        </div>
    );
}
