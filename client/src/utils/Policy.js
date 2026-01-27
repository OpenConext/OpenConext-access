import {isEmpty} from "./Utils.js";

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
                acc[attribute.name] = { name: attribute.name, value: [] };
            }
            acc[attribute.name].value.push({value: attribute.value, label: attribute.value});
            return acc;
        }, {})
    );
}

export const defaultAttributes = newAttributes => {
    return isEmpty(newAttributes) ? [{name: "", value: []}] : newAttributes;
}

export const flatMapByValues = attributes => {
    return attributes.flatMap(attribute =>
        attribute.value.map(val => ({
            name: attribute.name,
            value: val.value
        }))
    );
}