import {isEmpty, splitListSemantically} from "./Utils.js";

export const policyTemplate = (identityProviderEntityId, serviceProviderEntityId) => ({
    data: {
        active: true,
        allAttributesMustMatch: false,
        attributes: [{name: "", value: []}],
        denyAdvice: "",
        denyAdviceNl: "",
        denyRule: false,
        description: "",
        entityid: "",
        identityProviderIds: [{name: identityProviderEntityId}],
        metaDataFields: {},
        name: "",
        serviceProviderIds: [{name: serviceProviderEntityId}],
        type: "reg"
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
    const grouped = groupByValues([...policy.data.attributes]);
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