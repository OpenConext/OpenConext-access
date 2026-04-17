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
import {defaultAttributes, flatMapByValues, policyDesscription, policyTypes} from "../utils/Policy.js";
import {getNetworkInfo} from "../utils/CidrNotation.js";
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
    const [cidrErrors, setCidrErrors] = useState({});

    const isStep = policy.data.type === policyTypes.step;

    const conditionalOptions = ["any", "all"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));
    const negatedConditionalOptions = ["any", "none"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));
    const negatedOptions = ["any", "none"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));
    const orOptions = ["and", "or"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));

    // Reg-only options
    const accessOptions = ["allow", "deny"].map(name => ({value: name, label: I18n.t(`policies.form.${name}`)}));

    // Step-only: CIDR negation options
    const cidrNegationOptions = [
        {value: "force", label: I18n.t("appAccess.forceLoa")},
        {value: "doNotForce", label: I18n.t("appAccess.doNotForceLoa")}
    ];

    const {setFlash, allowedAttributes, config} = useAppStore(useShallow(state => ({
        setFlash: state.setFlash,
        allowedAttributes: state.allowedAttributes,
        config: state.config
    })));

    // LoA level options derived from config.acrValues
    const loaOptions = (config.acrValues || []).map(uri => {
        const suffix = uri.split("/").pop();
        const label = suffix.replace("loa", "LOA ");
        return {value: uri, label: I18n.t("appAccess.requireLoa", {level: label})};
    });

    const internalUpdatePolicy = updates => {
        setPolicy({...policy, data: {...policy.data, ...updates}});
    };

    const internalUpdateLoa = updates => {
        const loas = [...policy.data.loas];
        loas[0] = {...loas[0], ...updates};
        setPolicy({...policy, data: {...policy.data, loas}});
    };

    const loa = isStep ? policy.data.loas[0] : null;

    // Default LoA level to first acrValue (loa1.5) for new step-up policies
    if (isStep && isEmpty(loa.level) && loaOptions.length > 0) {
        loa.level = loaOptions[0].value;
    }

    const policyNameChanged = e => {
        const name = e.target.value;
        internalUpdatePolicy({name: name});
        setDuplicatePolicyName(false);
    };

    const validatePolicyName = e => {
        const name = e.target.value.trim();
        if (!isEmpty(name) && name !== originalName) {
            uniquePolicyName(name).then(res => {
                setDuplicatePolicyName(res.length > 0);
            });
        }
    };

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
                });
        }
    };

    // --- Reg: attribute functions ---

    const attributeSelected = (option, index) => {
        const newAttributes = [...policy.data.attributes];
        newAttributes[index] = {name: option.value, value: []};
        internalUpdatePolicy({attributes: newAttributes});
    };

    const attributeAdded = option => {
        const newAttributes = [...policy.data.attributes];
        newAttributes.push({name: option.value, value: []});
        internalUpdatePolicy({attributes: defaultAttributes(newAttributes)});
    };

    const attributeDeleted = index => {
        const deletedAttribute = policy.data.attributes[index];
        delete attributeValueErrors[deletedAttribute.name];
        setAttributeValueErrors({...attributeValueErrors});

        const filteredAttributes = policy.data.attributes.filter((item, i) => i !== index);
        const newAttributes = defaultAttributes(filteredAttributes);
        internalUpdatePolicy({attributes: newAttributes});
    };

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
    };

    const denyRuleToggle = val => {
        const denyRule = val === "deny";
        const newAttributes = denyRule ? policy.data.attributes
                .filter(attr => allowedAttributes.some(option => option.allowedInDenyRule && option.value === attr.name))
            : [...policy.data.attributes];
        internalUpdatePolicy({denyRule: denyRule, attributes: defaultAttributes(newAttributes)});
    };

    // --- Step: attribute functions (operate on loas[0].attributes) ---

    const stepAttributeSelected = (option, index) => {
        const newAttributes = [...loa.attributes];
        newAttributes[index] = {name: option.value, value: [], negated: false};
        internalUpdateLoa({attributes: newAttributes});
    };

    const stepAttributeAdded = () => {
        const newAttributes = [...loa.attributes];
        newAttributes.push({name: "", value: [], negated: false});
        internalUpdateLoa({attributes: defaultAttributes(newAttributes)});
    };

    const stepAttributeDeleted = index => {
        const deletedAttribute = loa.attributes[index];
        if (deletedAttribute.name) {
            delete attributeValueErrors[deletedAttribute.name];
            setAttributeValueErrors({...attributeValueErrors});
        }

        const filteredAttributes = loa.attributes.filter((item, i) => i !== index);
        internalUpdateLoa({attributes: filteredAttributes});
    };

    const stepAttributeValueChanged = (values, index) => {
        const newAttributes = [...loa.attributes];
        const attribute = newAttributes[index];
        attribute.value = values;
        internalUpdateLoa({attributes: newAttributes});
        const allowedAttr = allowedAttributes.find(attr => attr.value === attribute.name);
        if (allowedAttr) {
            const regex = new RegExp(allowedAttr.validationRegex);
            const invalidValues = values
                .map(value => value.value)
                .filter(value => !regex.test(value));
            setAttributeValueErrors({...attributeValueErrors, [attribute.name]: invalidValues});
        }
    };

    const stepAttributeNegatedChanged = (index) => {
        const newAttributes = [...loa.attributes];
        newAttributes[index] = {...newAttributes[index], negated: !newAttributes[index].negated};
        internalUpdateLoa({attributes: newAttributes});
    };

    // --- Step: CIDR functions ---

    const cidrAdded = () => {
        const newCidrs = [...loa.cidrNotations];
        newCidrs.push({ipAddress: "", prefix: 24, ipInfo: null});
        internalUpdateLoa({cidrNotations: newCidrs});
    };

    const cidrDeleted = index => {
        const newErrors = {...cidrErrors};
        delete newErrors[index];
        setCidrErrors(newErrors);

        const newCidrs = loa.cidrNotations.filter((_, i) => i !== index);
        internalUpdateLoa({cidrNotations: newCidrs});
    };

    const cidrChanged = (index, field, value) => {
        const newCidrs = [...loa.cidrNotations];
        const entry = {...newCidrs[index]};
        entry[field] = field === "prefix" ? parseInt(value, 10) || 0 : value;
        newCidrs[index] = entry;
        internalUpdateLoa({cidrNotations: newCidrs});
    };

    const cidrBlurred = (index) => {
        const newCidrs = [...loa.cidrNotations];
        const entry = {...newCidrs[index]};
        const newWarnings = {...cidrErrors};
        delete newWarnings[index];

        if (!isEmpty(entry.ipAddress)) {
            const isIPv6 = entry.ipAddress.includes(":");
            const minPrefix = isIPv6 ? 32 : 8;
            const maxPrefix = isIPv6 ? 128 : 32;

            // Clamp prefix to valid range
            if (entry.prefix < minPrefix) {
                entry.prefix = minPrefix;
            } else if (entry.prefix > maxPrefix) {
                entry.prefix = maxPrefix;
            }

            try {
                entry.ipInfo = getNetworkInfo(entry.ipAddress, entry.prefix);
            } catch {
                entry.ipInfo = null;
                newWarnings[index] = I18n.t("appAccess.invalidIp");
            }
        } else {
            entry.ipInfo = null;
        }

        newCidrs[index] = entry;
        setCidrErrors(newWarnings);
        internalUpdateLoa({cidrNotations: newCidrs});
        return true;
    };

    // --- Validation ---

    const isValid = () => {
        const allAttributesValuesValid = Object.values(attributeValueErrors).every(values => isEmpty(values));
        const hasCidrErrors = Object.values(cidrErrors).some(v => !isEmpty(v));

        if (isStep) {
            const hasLoaLevel = !isEmpty(loa.level);
            const cidrsValid = loa.cidrNotations.every(c => {
                if (isEmpty(c.ipAddress)) return false;
                const isIPv6 = c.ipAddress.includes(":");
                const minPrefix = isIPv6 ? 32 : 8;
                const maxPrefix = isIPv6 ? 128 : 32;
                return c.prefix >= minPrefix && c.prefix <= maxPrefix;
            });
            return !isEmpty(policy.data.name) && !duplicatePolicyName && hasLoaLevel
                && allAttributesValuesValid && !hasCidrErrors
                && (loa.cidrNotations.length === 0 || cidrsValid);
        }

        // Reg validation
        const hasAttributes = policy.data.attributes.filter(attr => !isEmpty(attr.name) && !isEmpty(attr.value)).length > 0;
        const required = ["name", "denyAdvice", "denyAdviceNl"];
        return required.every(attr => !isEmpty(policy.data[attr])) && !duplicatePolicyName && allAttributesValuesValid && hasAttributes;
    };

    // --- Submit ---

    const submit = () => {
        setInitial(false);

        if (isValid()) {
            const promise = isExistingPolicy ? updatePolicy : newPolicy;

            if (isStep) {
                // Flatten step attributes
                const flatAttrs = flatMapByValues([...loa.attributes]);
                const loas = [...policy.data.loas];
                loas[0] = {...loas[0], attributes: flatAttrs};
                policy.data.loas = loas;
                policy.data.description = policyDesscription(
                    allowedAttributes,
                    policy,
                    null,
                    I18n.t("forms.or"),
                    null,
                    null
                );
            } else {
                // Reg: flatten attributes and generate description
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
            }

            promise(policy, currentOrganization.id)
                .then(res => {
                    setFlash(I18n.t(`appAccess.flash.${isExistingPolicy ? "updated" : "created"}`, {name: res.data.name}));
                    refreshPolicies();
                });
        }
    };

    const renderNameSection = () => (
        <>
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
        </>
    );

    const renderServiceProviders = () => (
        <>
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
            {(!initial && isEmpty(policy.data.serviceProviderIds)) &&
                <ErrorIndicator adjustMargin={true}
                                msg={I18n.t("forms.required", {name: I18n.t("policies.serviceProviders")})}/>}
        </>
    );

    const renderRegFilters = () => (
        <>
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

                            <span className="conditional-options">{conditionalOptions[0].label}</span>

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
                    <Button type={ButtonType.Secondary}
                            onClick={() => attributeAdded({name: null})}
                            txt={I18n.t("appAccess.addAttributePlaceholder")}/>
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
        </>
    );

    const renderStepUpSettings = () => (
        <>
            <span className="label standalone">{I18n.t("appAccess.assuranceSettings")}</span>
            <div className="step-up-settings">
                {/* LoA level selector row */}
                <div className="loa-selector-row">
                    <SelectField value={loaOptions.find(o => o.value === loa.level) || null}
                                 required={true}
                                 className="loa-level-select"
                                 placeholder={I18n.t("appAccess.requireLoa", {level: "..."})}
                                 error={!initial && isEmpty(loa.level)}
                                 onChange={option => internalUpdateLoa({level: option.value})}
                                 options={loaOptions}/>
                    <span className="when-label">{I18n.t("appAccess.when")}</span>
                </div>
                {(!initial && isEmpty(loa.level)) &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("appAccess.loaRequired")}/>}

                {/* Step attribute rows */}
                {loa.attributes.map((attribute, index) =>
                    <Fragment key={index}>
                        <div className="deletable-attribute">
                            {index !== 0 &&
                                <SelectField
                                    value={loa.allAttributesMustMatch ? orOptions[0] : orOptions[1]}
                                    required={true}
                                    className="select-access-rule"
                                    onChange={() => internalUpdateLoa({allAttributesMustMatch: !loa.allAttributesMustMatch})}
                                    options={orOptions}/>
                            }
                            <SelectField placeholder={I18n.t("appAccess.attributePlaceholder")}
                                         value={isEmpty(attribute.name) ? null : allowedAttributes.find(attr => attr.value === attribute.name)}
                                         required={true}
                                         className="attribute-name"
                                         onChange={option => stepAttributeSelected(option, index)}
                                         options={allowedAttributes}/>

                            <SelectField value={attribute.negated ? negatedConditionalOptions[1] : negatedConditionalOptions[0]}
                                         required={true}
                                         className="conditional-options"
                                         onChange={() => stepAttributeNegatedChanged(index)}
                                         options={negatedConditionalOptions}/>

                            <SelectField value={attribute.value}
                                         creatable={true}
                                         required={true}
                                         className="attribute-value"
                                         error={!initial && isEmpty(attribute.value)}
                                         placeholder={I18n.t("appAccess.permittedValuesPlaceholder")}
                                         onChange={values => stepAttributeValueChanged(values, index)}
                            />
                            <Button type={ButtonType.Delete}
                                    onClick={() => stepAttributeDeleted(index)}
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
                {/* CIDR notation entries */}
                {loa.cidrNotations.map((cidr, index) =>
                    <div className="cidr-entry" key={`cidr-${index}`}>
                        <div className="cidr-inputs">
                            <span>{I18n.t("appAccess.andIPAddress")}</span>
                            <SelectField value={loa.negateCidrNotation ? negatedConditionalOptions[1] : negatedConditionalOptions[0]}
                                         required={true}
                                         className="conditional-options"
                                         onChange={() => internalUpdateLoa({negateCidrNotation: !loa.negateCidrNotation})}
                                         options={negatedConditionalOptions}/>
                            <div className="input-field-wrapper">
                                <InputField value={cidr.ipAddress}
                                            placeholder="192.168.1.0"
                                            customClassName="ip-address-input-field"
                                            onChange={e => cidrChanged(index, "ipAddress", e.target.value)}
                                            onBlur={() => cidrBlurred(index)}
                                />
                                {cidr.ipInfo &&
                                    <div className="cidr-info">
                                        <span>{I18n.t("appAccess.ipAddress", {type: cidr.ipInfo.ipv4 ? "IPv4" : "IPv6"})}</span>
                                        <span>{I18n.t("appAccess.networkAddress")}: {cidr.ipInfo.networkAddress}</span>
                                        <span>{I18n.t("appAccess.broadcastAddress")}: {cidr.ipInfo.broadcastAddress}</span>
                                        <span>{I18n.t("appAccess.capacity")}: {cidr.ipInfo.capacity}</span>
                                    </div>}
                            </div>
                            <span>{I18n.t("appAccess.prefix")}</span>
                            <InputField value={`${cidr.prefix}`}
                                        placeholder="24"
                                        customClassName="prefix-input-field"
                                        onChange={e => cidrChanged(index, "prefix", e.target.value)}
                                        onBlur={() => cidrBlurred(index)}
                            />
                            <Button type={ButtonType.Delete}
                                    onClick={() => cidrDeleted(index)}
                            />
                        </div>
                        {!isEmpty(cidrErrors[index]) &&
                            <ErrorIndicator msg={cidrErrors[index]}/>
                            }

                    </div>)}

                {/* Add buttons */}
                <div className="add-buttons-row">
                    <Button type={ButtonType.Secondary}
                            onClick={stepAttributeAdded}
                            txt={`+ ${I18n.t("appAccess.addAttributePlaceholder")}`}/>
                    <Button type={ButtonType.Secondary}
                            onClick={cidrAdded}
                            txt={`+ ${I18n.t("appAccess.addIpRange")}`}/>
                </div>
            </div>
        </>
    );

    const renderActions = () => (
        <div className="actions">
            {!isEmpty(policy.id) && <TrashIcon onClick={() => doDeletePolicy(true, policy)}/>}
            <Button type={ButtonType.Secondary}
                    onClick={refreshPolicies}
                    txt={I18n.t("forms.cancel")}/>
            <Button type={ButtonType.Primary}
                    onClick={() => submit()}
                    disabled={!initial && !isValid()}
                    txt={I18n.t(`appAccess.${isExistingPolicy ? "submitExisting" : "submitNew"}`)}/>
        </div>
    );

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
                    <h2>{I18n.t(`appAccess.${isExistingPolicy ? (isStep ? "editStepUpPolicy" : "editPolicy") : (isStep ? "newStepUpPolicy" : "newPolicy")}`)}</h2>
                    {isExistingPolicy &&
                        <div className="policy-header-actions">
                            <Chip type={ChipType.Status_info}
                                  label={I18n.t(`appAccess.${policy.data.active ? "active" : "paused"}`)}/>
                        </div>}
                </div>
            </div>

            <div className="policy-form">
                {renderNameSection()}
                {renderServiceProviders()}
                {isStep ? renderStepUpSettings() : renderRegFilters()}
            </div>
            {renderActions()}
        </div>
    );
}
