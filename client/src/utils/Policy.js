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
                acc[attribute.name] = {
                    name: attribute.name,
                    value: [],
                    ...(attribute.negated !== undefined && {negated: attribute.negated})
                };
            }
            acc[attribute.name].value.push({value: attribute.value, label: attribute.value});
            return acc;
        }, {})
    );
}

export const defaultAttributes = newAttributes => {
    return isEmpty(newAttributes) ? [{name: null, value: []}] : newAttributes;
}

const attributeName = (allowedAttributes, attribute) => {
    const res = allowedAttributes.find(attr => attr.value === attribute.name);
    return res.label;
}

export const policyBreakDowwn = (allowedAttributes, policy, prefix, orSeparator, attributeSeparator) => {
    if (policy.data.type === policyTypes.step) {
        return stepPolicyBreakDown(allowedAttributes, policy, orSeparator);
    }
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

const stepPolicyBreakDown = (allowedAttributes, policy, orSeparator) => {
    const loa = policy.data.loas[0];
    const grouped = groupByValues([...loa.attributes]);
    const attributeSeparator = I18n.t(`forms.${loa.allAttributesMustMatch ? "and" : "or"}`);
    const prefix = I18n.t("appAccess.breakdown.when").toLowerCase();
    const rules = [];

    grouped.forEach((attribute, index) => {
        if (index > 0) {
            rules.push(attributeSeparator);
        }
        const name = attributeName(allowedAttributes, attribute);
        const qualifier = attribute.negated
            ? I18n.t("appAccess.breakdown.stepIsNoneOf")
            : I18n.t("appAccess.breakdown.stepIsAnyOf");
        const values = splitListSemantically(attribute.value.map(val => `'${val.label}'`), orSeparator);
        rules.push(`${prefix} ${name} ${qualifier} ${values}`);
    });

    if (loa.cidrNotations && loa.cidrNotations.length > 0) {
        if (rules.length > 0) {
            rules.push(attributeSeparator);
        }
        const cidrPrefix = loa.negateCidrNotation
            ? I18n.t("appAccess.breakdown.stepIpNotIn")
            : I18n.t("appAccess.breakdown.stepIpIn");
        const cidrValues = loa.cidrNotations
            .map(c => `${c.ipAddress}/${c.prefix}`)
            .join(", ");
        rules.push(`${prefix} ${cidrPrefix} ${cidrValues}`);
    }

    return rules;
}

export const policyDesscription = (allowedAttributes, policy, prefix, orSeparator, attributeSeparator, prefixDescription) => {
    if (policy.data.type === policyTypes.step) {
        const loa = policy.data.loas[0];
        const loaLabel = loa.level.split("/").pop().replace("loa", "LOA ");
        const sp = policy.data.serviceProviderIds.map(sp => sp.name).join(", ");
        const stepPrefix = I18n.t("appAccess.breakdown.stepDescriptionPrefix", {loa: loaLabel, sp: sp});
        const breakDown = stepPolicyBreakDown(allowedAttributes, policy, orSeparator);
        if (breakDown.length === 0) {
            return `${stepPrefix}.`;
        }
        return `${stepPrefix} ${breakDown.join(" ")}.`;
    }
    const breakDown = policyBreakDowwn(allowedAttributes, policy, prefix, orSeparator, attributeSeparator);
    return `${prefixDescription} ${breakDown.join(" ")}.`;
}

export const flatMapByValues = attributes => {
    return attributes.flatMap(attribute =>
        attribute.value.map(val => ({
            name: attribute.name,
            value: val.value,
            ...(attribute.negated !== undefined && {negated: attribute.negated})
        }))
    );
}