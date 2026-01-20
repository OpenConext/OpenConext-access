import {isEmpty} from "./Utils.js";

const createIdPOption = (locale, idp) => {
    const metaData = idp.data.metaDataFields;
    const name = locale === "en" ? metaData["name:en"] : metaData["name:nl"] || metaData["name:en"];
    const organization = locale === "en" ? metaData["OrganizationName:en"] : metaData["OrganizationName:nl"] || metaData["OrganizationName:en"];
    return {label: `${name} (${organization})`, value: idp.data.entityid}
}

export const identityProviderOption = (identityProviders, entityId, locale) => {
    const idp = identityProviders.find(entity => entity.data.entityid === entityId);
    return isEmpty(idp) ? null : createIdPOption(locale, idp);
}

export const identityProviderOptions = (identityProviders, locale) => {
    return identityProviders.map(idp => createIdPOption(locale, idp))
}

export const providerOrganizationName = (locale, provider) => {
    const metaData = provider.data.metaDataFields;
    const orgName = (locale === "en" ? metaData["OrganizationName:en"] : metaData["OrganizationName:nl"] || metaData["OrganizationName:en"]);
    if (!isEmpty(orgName)) {
        return orgName;
    }
    const name = providerName(locale, provider);
    if (!isEmpty(name)) {
        return name;
    }
    return "";
}

export const providerName = (locale, provider) => {
    const metaData = provider.data.metaDataFields;
    const name = ( locale === "en" ? metaData["name:en"] : metaData["name:nl"] || metaData["name:en"]);
    return name || "";
}

export const providerDescription = (locale, provider) => {
    const metaData = provider.data.metaDataFields;
    const description = ( locale === "en" ? metaData["description:en"] : metaData["description:nl"] || metaData["description:en"]);
    return description || "";
}

export const isAccessRoleReady = provider => {
    //If not enabled, then all sources are the IdP
    const isMemberOfArpArray = provider.data.arp.attributes["urn:mace:dir:attribute-def:isMemberOf"];
    return provider.data.arp.enabled === true &&
        !isEmpty(isMemberOfArpArray) && ["voot", "invite"].includes(isMemberOfArpArray[0].source);
}

export const PROTOCOLS = {
    OIDC10_RP: "oidc10_rp", SAML20_SP: "saml20_sp"
}

export const CONNECTION_STATUSES = {
    OPEN: "OPEN", IN_PROGRESS: "IN_PROGRESS", COMPLETE: "COMPLETE", PENDING_PROD: "PENDING_PROD", PROD_READY: "PROD_READY"
}

export const APPLICATION_STATUSES = {
    OPEN: "OPEN", COMPLETE: "COMPLETE"
}

export const ORGANIZATION_STATUSES = {
    PENDING_APPROVAL: "PENDING_APPROVAL", APPROVED: "APPROVED", DISAPPROVED: "DISAPPROVED"
}

export const ENVIRONMENTS = {
    TEST: "TEST", PROD: "PROD"
}

export const CHANGE_REQUEST_TYPE = {
    PRODUCTION_STATUS_REQUEST: "ProductionStatusRequest",
    LINK_REQUEST: "LinkRequest",
    UNLINK_REQUEST:"UnlinkRequest",
    CHANGE:"Change",
    LINK_INVITE:"LinkInvite",
    UNLINK_INVITE: "UnlinkInvite"
}

export const APPLICATION_LINKS = [
    {
        locale: "applicationDetail.website",
        metaData:"OrganizationURL",
        languageProperty: true
    },
    {
        locale: "applicationDetail.loginPage",
        metaData:"coin:application_url",
        languageProperty: false
    },
    {
        locale: "applicationDetail.support",
        metaData:"url",
        languageProperty: true
    },
    {
        locale: "applicationDetail.terms",
        metaData:"coin:eula",
        languageProperty: false
    },
    {
        locale: "applicationDetail.registrationPolicy",
        metaData:"mdrpi:RegistrationPolicy",
        languageProperty: true
    },
    {
        locale: "applicationDetail.privacyStatement",
        metaData:"mdui:PrivacyStatementURL",
        languageProperty: true
    },
]