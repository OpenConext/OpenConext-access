import "./PolicyForm.scss";
import React, {useEffect, useState} from "react";
import {Button, ButtonIconPlacement, ButtonType, Chip, ChipType, SegmentedControl, Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import InputField from "../components/InputField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import {allowedAttributes, deletePolicy, newPolicy, uniquePolicyName, updatePolicy} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import SelectField from "../components/SelectField.jsx";
import {defaultAttributes, flatMapByValues} from "../utils/Policy.js";
import PauzeIcon from "../icons/pauze.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import ActivateIcon from "@surfnet/sds/icons/functional-icons/success.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

export const PolicyForm = ({policy, setPolicy, isExistingPolicy, originalName, refreshPolicies}) => {

    const [allAllowedAttributes, setAllAllowedAttributes] = useState([]);
    const [initial, setInitial] = useState(true);
    const [duplicatePolicyName, setDuplicatePolicyName] = useState(false);
    const [showActivateNudge, setShowActivateNudge] = useState(false);
    const [confirmation, setConfirmation] = useState({});

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

    const internalUpdatePolicy = updates => {
        setPolicy({...policy, data: {...policy.data, ...updates}})
    }

    const isValid = () => {
        return required.every(attr => !isEmpty(policy.data[attr])) && !duplicatePolicyName;
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
            promise(policy)
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
        const newAttributes = policy.data.attributes.filter((item, i) => i !== index);
        internalUpdatePolicy({attributes: defaultAttributes(newAttributes)})
    }

    const attributeValueChanged = (value, index) => {
        const newAttributes = [...policy.data.attributes];
        const attribute = newAttributes[index];
        attribute.value = value;
        internalUpdatePolicy({attributes: newAttributes})
    }

    const denyRuleToggle = val => {
        const denyRule = val === "deny";
        const newAttributes = denyRule ? policy.data.attributes
                .filter(attr => allAllowedAttributes.some(option => option.allowedInDenyRule && option.value === attr.name))
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

    const activeToggled = () => {
        internalUpdatePolicy({active: !policy.data.active});
        setShowActivateNudge(true);
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
                    <h2>{I18n.t(`appAccess.${isExistingPolicy ? "editPolicy" : "newPolicy"}`)}</h2>
                    {isExistingPolicy &&
                        <div className="policy-header-actions">
                            <Chip type={ChipType.Status_info}
                                  label={I18n.t(`appAccess.${policy.data.active ? "active" : "paused"}`)}/>
                            <Button type={ButtonType.Secondary}
                                    icon={policy.data.active ? <PauzeIcon/> : <ActivateIcon/>}
                                    iconPlacement={ButtonIconPlacement.Left}
                                    onClick={() => activeToggled()}
                                    txt={I18n.t(`appAccess.${policy.data.active ? "pause" : "activate"}`)}/>
                            <TrashIcon onClick={() => doDeletePolicy(true, policy)}/>
                        </div>}
                </div>
                {showActivateNudge && <div className="header-bottom">
                    <em>{I18n.t("appAccess.activateNudge",
                        {action: I18n.t(`appAccess.${policy.data.active ? "activate" : "pause"}`).toLowerCase()})}
                    </em>
                </div>}
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

                <InputField name={I18n.t("appAccess.description")}
                            value={policy.data.description}
                            required={true}
                            multiline={true}
                            error={!initial && isEmpty(policy.data.description)}
                            placeholder={I18n.t("appAccess.placeholderDescription")}
                            onChange={e => internalUpdatePolicy({description: e.target.value})}
                />
                {(!initial && isEmpty(policy.data.description)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("forms.required", {name: I18n.t("appAccess.description")})}/>}

                <div className="row">
                    <div className="row-item">
                        <span className="label standalone">{I18n.t("appAccess.allowDeny")}
                            <Tooltip tip={I18n.t("appAccess.denyRuleTooltip")}/>
                        </span>
                        <SegmentedControl onClick={val => denyRuleToggle(val)}
                                          option={policy.data.denyRule ? "deny" : "allow"}
                                          options={["deny", "allow"]}
                                          optionLabelResolver={option => I18n.t(`appAccess.${option}`)}/>
                    </div>
                    <div className="row-item">
                        <span className="label standalone">{I18n.t("appAccess.allAttributesMatch")}
                            <Tooltip tip={I18n.t("appAccess.allAttributesMatchTooltip")}/>
                        </span>
                        <SegmentedControl onClick={val => internalUpdatePolicy({allAttributesMustMatch: val === "all"})}
                                          option={policy.data.allAttributesMustMatch ? "all" : "any"}
                                          options={["all", "any"]}
                                          optionLabelResolver={option => I18n.t(`appAccess.${option}`)}/>
                    </div>
                </div>
                <span className="label standalone">{I18n.t("appAccess.filters")}</span>
                <div className="filters">
                    {policy.data.attributes.map((attribute, index) =>
                        <div key={index} className="attribute">
                            <div className="attribute-name-wrapper">
                                <SelectField name={I18n.t("appAccess.attribute")}
                                             placeholder={I18n.t("appAccess.attributePlaceholder")}
                                             value={allAllowedAttributes.find(attr => attr.value === attribute.name)}
                                             required={true}
                                             onChange={option => attributeSelected(option, index)}
                                             options={policy.data.denyRule ? allAllowedAttributes
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
                    {policy.data.attributes.every(attribute => attribute.name && !isEmpty(attribute.value)) &&
                        <div className="add-attribute-container">
                            <SelectField placeholder={I18n.t("appAccess.addAttributePlaceholder")}
                                         value={null}
                                         onChange={option => attributeAdded(option)}
                                         options={policy.data.denyRule ? allAllowedAttributes
                                             .filter(option => option.allowedInDenyRule) : allAllowedAttributes}/>
                        </div>
                    }

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
