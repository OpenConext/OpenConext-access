import {isEmpty, splitListSemantically} from "./Utils.js";
import I18n from "../locale/I18n";

export const policyTypes = {
    reg: "reg",
    step: "step"
}

export const policyTemplateRegular = (identityProviderEntityId, serviceProviderEntityId = null) => ({
    data: {
        active: true,
        allAttributesMustMatch: false,
        attributes: [{name: "", value: []}],
        denyAdvice: I18n.translations.en.policies.defaultDenyDescription,
        denyAdviceNl: I18n.translations.nl.policies.defaultDenyDescription,
        denyRule: false,
        description: "",
        entityid: "",
        identityProviderIds: [{name: identityProviderEntityId}],
        metaDataFields: {},
        name: "",
        serviceProviderIds: isEmpty(serviceProviderEntityId) ? [] : [{name: serviceProviderEntityId}],
        type: policyTypes.reg
    },
    type: "policy"
});

export const policyTemplateStepUp = (identityProviderEntityId, serviceProviderEntityId = null) => ({
    data: {
        active: true,
        allAttributesMustMatch: false,
        attributes: [],
        denyAdvice: "",
        denyAdviceNl: "",
        denyRule: false,
        description: "",
        entityid: "",
        loas: [{
            allAttributesMustMatch: true,
            level: "",
            negateCidrNotation: false,
            attributes: [
                {
                    name: "",
                    value: [],
                    negated: false
                }
            ],
            cidrNotations: []
        }],
        identityProviderIds: [{name: identityProviderEntityId}],
        metaDataFields: {},
        name: "",
        serviceProviderIds: isEmpty(serviceProviderEntityId) ? [] : [{name: serviceProviderEntityId}],
        type: policyTypes.step
    },
    type: "policy"
});

export const groupByValues = attributes => {
    return Object.values(
        attributes.reduce((acc, attribute) => {
            if (!acc[attribute.name]) {
                acc[attribute.name] = {name: attribute.name, value: []};
            }
            acc[attribute.name].value.push({value: attribute.value, label: attribute.value});
            return acc;
        }, {})
    );
}

export const defaultAttributes = newAttributes => {
    return isEmpty(newAttributes) ? [{name: "", value: []}] : newAttributes;
}

const attributeName = (allowedAttributes, attribute) => {
    const res = allowedAttributes.find(attr => attr.value === attribute.name);
    return res.label;
}

export const policyBreakDowwn = (allowedAttributes, policy, prefix, orSeparator, attributeSeparator) => {
    const grouped = policy.data.type === policyTypes.reg ? groupByValues([...policy.data.attributes]) :
        groupByValues([...policy.data.loas.map(loa => loa.attributes).flat()]);
    const policyRules = grouped.map(attribute => {
        const name = attributeName(allowedAttributes, attribute);
        const values = splitListSemantically(attribute.value.map(val => `'${val.label}'`), orSeparator)
        return `${prefix} ${name} = ${values}`;
    });
    return policyRules.flatMap((item, index) =>
        index < policyRules.length - 1 ? [item, attributeSeparator] : [item]
    );
}

export const policyDesscription = (allowedAttributes, policy, prefix, orSeparator, attributeSeparator, prefixDescription) => {
    const breakDown = policyBreakDowwn(allowedAttributes, policy, prefix, orSeparator, attributeSeparator);
    return `${prefixDescription} ${breakDown.join(" ")}.`;
}

export const flatMapByValues = attributes => {
    return attributes.flatMap(attribute =>
        attribute.value.map(val => ({
            name: attribute.name,
            value: val.value
        }))
    );
}