import "./PolicyForm.scss";
import React, {Fragment, useState} from "react";
import {Button, ButtonType, Chip, ChipType} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import InputField from "../components/InputField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import {deletePolicy, newPolicy, uniquePolicyName, updatePolicy} from "../api/index.js";
import {isEmpty, splitListSemantically} from "../utils/Utils.js";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import SelectField from "../components/SelectField.jsx";
import {defaultAttributes, flatMapByValues, policyDesscription} from "../utils/Policy.js";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";


export const PolicyForm = ({
                               policy,
                               setPolicy,
                               isExistingPolicy,
                               currentOrganization,
                               originalName,
                               refreshPolicies,
                               serviceProviderOptions
                           }) => {

    const [initial, setInitial] = useState(true);
    const [duplicatePolicyName, setDuplicatePolicyName] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [attributeValueErrors, setAttributeValueErrors] = useState({});

    const accessOptions = ["allow", "deny"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));
    const conditionalOptions = ["any", "all"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));
    const negatedOptions = ["any", "none"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));
    const orOptions = ["and", "or"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));

    const required = ["name", "denyAdvice", "denyAdviceNl"];

    const {setFlash, allowedAttributes} = useAppStore(useShallow(state => ({
        setFlash: state.setFlash,
        allowedAttributes: state.allowedAttributes
    })));

    const internalUpdatePolicy = updates => {
        setPolicy({...policy, data: {...policy.data, ...updates}})
    }

    const isValid = () => {
        const allAttributesValuesValid = Object.values(attributeValueErrors).every(values => isEmpty(values));
        const hasAttributes = policy.data.attributes.filter(attr => !isEmpty(attr.name) && !isEmpty(attr.value)).length > 0;
        return required.every(attr => !isEmpty(policy.data[attr])) && !duplicatePolicyName && allAttributesValuesValid && hasAttributes;
    }

    const doDeletePolicy = (confirmationRequired, policy) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDeletePolicy(false, policy),
                question: I18n.t("appAccess.confirmation.deleteQuestion"),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deletePolicy(policy)
                .then(() => {
                    setConfirmation({});
                    refreshPolicies();
                    setFlash(I18n.t("appAccess.flash.deleted", {
                        name: policy.data.name
                    }));
                })
        }
    }

    const submit = () => {
        setInitial(false);

        if (isValid()) {
            const promise = isExistingPolicy ? updatePolicy : newPolicy;
            //We need to destructure the attributes with multiple values, to single attribute / value pairs
            policy.data.attributes = flatMapByValues([...policy.data.attributes]);
            policy.data.description = policyDesscription(
                allowedAttributes,
                policy,
                I18n.t(`appAccess.breakdown.${policy.data.denyRule ? "when" : "if"}`).toLowerCase(),
                I18n.t("forms.or"),
                I18n.t(`forms.${policy.data.allAttributesMustMatch ? "and" : "or"}`),
                I18n.t(`appAccess.breakdown.${policy.data.denyRule ? "deny" : "allow"}DescriptionPrefix`, {
                    idp: policy.data.identityProviderIds[0].name, sp: policy.data.serviceProviderIds[0].name
                })
            );
            promise(policy, currentOrganization.id)
                .then(res => {
                    setFlash(I18n.t(`appAccess.flash.${isExistingPolicy ? "updated" : "created"}`, {name: res.data.name}));
                    refreshPolicies();
                });
        }
    }

    const attributeSelected = (option, index) => {
        const newAttributes = [...policy.data.attributes];
        newAttributes[index] = {name: option.value, value: []};
        internalUpdatePolicy({attributes: newAttributes})
    }

    const attributeAdded = option => {
        const newAttributes = [...policy.data.attributes];
        newAttributes.push({name: option.value, value: []});
        internalUpdatePolicy({attributes: defaultAttributes(newAttributes)})
    }

    const attributeDeleted = index => {
        const deletedAttribute = policy.data.attributes[index];
        delete attributeValueErrors[deletedAttribute.name];
        setAttributeValueErrors({...attributeValueErrors});

        const filteredAttributes = policy.data.attributes.filter((item, i) => i !== index);
        const newAttributes = defaultAttributes(filteredAttributes);
        internalUpdatePolicy({attributes: newAttributes});
    }

    const attributeValueChanged = (values, index) => {
        const newAttributes = [...policy.data.attributes];
        const attribute = newAttributes[index];
        attribute.value = values;
        internalUpdatePolicy({attributes: newAttributes});
        const validationRegex = allowedAttributes.find(attr => attr.value === attribute.name).validationRegex;
        const regex = new RegExp(validationRegex);
        const invalidValues = values
            .map(value => value.value)
            .filter(value => !regex.test(value));
        setAttributeValueErrors({...attributeValueErrors, [attribute.name]: invalidValues});
    }

    const denyRuleToggle = val => {
        const denyRule = val === "deny";
        const newAttributes = denyRule ? policy.data.attributes
                .filter(attr => allowedAttributes.some(option => option.allowedInDenyRule && option.value === attr.name))
            : [...policy.data.attributes];
        internalUpdatePolicy({denyRule: denyRule, attributes: defaultAttributes(newAttributes)})
    }

    const policyNameChanged = e => {
        const name = e.target.value;
        internalUpdatePolicy({name: name});
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

    const {open, cancel, action, question, okButton} = confirmation;

    return (
        <div className="policy-form-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("confirmationDialog.confirm")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <div className="policy-form-header">
                <div className="header-top">
                    <h2>{I18n.t(`appAccess.${isExistingPolicy ? (policy.data.type === "reg" ? "editPolicy" : "editStepUpPolicy") : (policy.data.type === "reg" ? "newPolicy" : "newStepUpPolicy")}`)}</h2>
                    {isExistingPolicy &&
                        <div className="policy-header-actions">
                            <Chip type={ChipType.Status_info}
                                  label={I18n.t(`appAccess.${policy.data.active ? "active" : "paused"}`)}/>
                        </div>}
                </div>
            </div>

            <div className="policy-form">
                <InputField name={I18n.t("appAccess.targetGroup")}
                            value={policy.data.name}
                            required={true}
                            onBlur={validatePolicyName}
                            error={!initial && isEmpty(policy.data.name) || duplicatePolicyName}
                            placeholder={I18n.t("appAccess.placeholderTargetGroup")}
                            onChange={policyNameChanged}
                />
                {(!initial && isEmpty(policy.data.name)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.targetGroup")})}/>}
                {duplicatePolicyName &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("appAccess.duplicateName", {name: policy.data.name})}/>}

                <label className="stand-alone">{I18n.t("policies.serviceProviders")}</label>
                <div className="row-service-providers">
                    <SelectField value={policy.data.serviceProvidersNegated ? negatedOptions[1] : negatedOptions[0]}
                                 required={true}
                                 onChange={() => internalUpdatePolicy({serviceProvidersNegated: !policy.data.serviceProvidersNegated})}
                                 className="any-of-service-providers"
                                 options={negatedOptions}/>
                    <SelectField
                        value={serviceProviderOptions.filter(option => policy.data.serviceProviderIds.some(sp => sp.name === option.value))}
                        searchable={true}
                        options={serviceProviderOptions}
                        className="service-providers"
                        placeholder={I18n.t("policies.serviceProvidersPlaceholderPolicy")}
                        onChange={val => internalUpdatePolicy({
                            serviceProviderIds: isEmpty(val) ? [] :
                                val.map(sp => ({name: sp.value}))
                        })}
                        isMulti={true}/>
                </div>

                <span className="label standalone">{I18n.t("appAccess.filters")}</span>
                <div className="filters">
                    {policy.data.attributes.map((attribute, index) =>
                        <Fragment key={index}>
                            <div className="deletable-attribute">
                                {index === 0 &&
                                    <SelectField value={policy.data.denyRule ? accessOptions[1] : accessOptions[0]}
                                                 required={true}
                                                 className="select-access-rule"
                                                 onChange={option => denyRuleToggle(option.value)}
                                                 options={accessOptions}/>
                                }
                                {index !== 0 &&
                                    <SelectField
                                        value={policy.data.allAttributesMustMatch ? orOptions[0] : orOptions[1]}
                                        required={true}
                                        className="select-access-rule"
                                        onChange={() => internalUpdatePolicy({allAttributesMustMatch: !policy.data.allAttributesMustMatch})}
                                        options={orOptions}/>
                                }
                                <SelectField placeholder={I18n.t("appAccess.attributePlaceholder")}
                                             value={isEmpty(attribute.name) ? null : allowedAttributes.find(attr => attr.value === attribute.name)}
                                             required={true}
                                             className="attribute-name"
                                             onChange={option => attributeSelected(option, index)}
                                             options={policy.data.denyRule ? allowedAttributes
                                                 .filter(option => option.allowedInDenyRule) : allowedAttributes}/>

                                <SelectField value={conditionalOptions[0]}
                                             required={true}
                                             disabled={true}
                                             className="conditional-options"
                                             options={conditionalOptions}/>

                                <SelectField value={attribute.value}
                                             creatable={true}
                                             required={true}
                                             className="attribute-value"
                                             error={!initial && isEmpty(attribute.value)}
                                             placeholder={I18n.t("appAccess.permittedValuesPlaceholder")}
                                             onChange={values => attributeValueChanged(values, index)}
                                />
                                <Button type={ButtonType.Delete}
                                        onClick={() => attributeDeleted(index)}
                                />
                            </div>
                            {!isEmpty(attributeValueErrors[attribute.name]) &&
                                <ErrorIndicator adjustMargin={false}
                                                msg={I18n.t("appAccess.attributeValueErrors",
                                                    {
                                                        name: allowedAttributes.find(attr => attr.value === attribute.name).label,
                                                        values: splitListSemantically(
                                                            attributeValueErrors[attribute.name].map(val => `'${val}'`),
                                                            I18n.t("forms.and"))
                                                    })}/>}
                        </Fragment>)}
                    {(!initial && policy.data.attributes.filter(attr => !isEmpty(attr.name) && !isEmpty(attr.value)).length === 0) &&
                        <ErrorIndicator msg={I18n.t("policies.attributesRequired")}/>}
                    <div className="add-attribute-container">
                        <SelectField placeholder={I18n.t("appAccess.addAttributePlaceholder")}
                                     value={null}
                                     onChange={option => attributeAdded(option)}
                                     options={policy.data.denyRule ? allowedAttributes
                                         .filter(option => option.allowedInDenyRule) : allowedAttributes}/>
                    </div>

                </div>

                <InputField name={I18n.t("appAccess.denyEn")}
                            value={policy.data.denyAdvice}
                            required={true}
                            error={!initial && isEmpty(policy.data.denyAdvice)}
                            placeholder={I18n.t("appAccess.denyPlaceholder")}
                            onChange={e => internalUpdatePolicy({denyAdvice: e.target.value})}
                />
                {(!initial && isEmpty(policy.data.denyAdvice)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.denyEn")})}/>}

                <InputField name={I18n.t("appAccess.denyNl")}
                            value={policy.data.denyAdviceNl}
                            required={true}
                            error={!initial && isEmpty(policy.data.denyAdviceNl)}
                            placeholder={I18n.t("appAccess.denyPlaceholder")}
                            onChange={e => internalUpdatePolicy({denyAdviceNl: e.target.value})}
                />
                {(!initial && isEmpty(policy.data.denyAdviceNl)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.denyNl")})}/>}

            </div>
            <div className="actions">
                <TrashIcon onClick={() => doDeletePolicy(true, policy)}/>
                <Button type={ButtonType.Secondary}
                        onClick={refreshPolicies}
                        txt={I18n.t("forms.cancel")}/>
                <Button type={ButtonType.Primary}
                        onClick={() => submit()}
                        disabled={!initial && !isValid()}
                        txt={I18n.t(`appAccess.${isExistingPolicy ? "submitExisting" : "submitNew"}`)}/>
            </div>
        </div>
    );
}
