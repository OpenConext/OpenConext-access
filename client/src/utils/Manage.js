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
    const isMemberOfArpArray = provider.data?.arp?.attributes?.["urn:mace:dir:attribute-def:isMemberOf"];
    return provider.data.arp?.enabled === true &&
        !isEmpty(isMemberOfArpArray) && ["voot", "invite"].includes(isMemberOfArpArray[0].source);
}

export const PROTOCOLS = {
    OIDC10_RP: "oidc10_rp", SAML20_SP: "saml20_sp"
}

export const CONNECTION_STATUSES = {
    OPEN: "OPEN",
    COMPLETE: "COMPLETE",
    PENDING_PROD: "PENDING_PROD",
    PROD_READY: "PROD_READY",
}

export const APPLICATION_STATUSES = {
    OPEN: "OPEN",
    COMPLETE: "COMPLETE"
}

export const ORGANIZATION_STATUSES = {
    PENDING_APPROVAL: "PENDING_APPROVAL",
    APPROVED: "APPROVED",
    DISAPPROVED: "DISAPPROVED"
}

export const STATE = {
    testaccepted: "testaccepted", prodaccepted: "prodaccepted"
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
        metaData:"coin:login_url",
        languageProperty: false
    },
    {
        locale: "applicationDetail.applicationPage",
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

export const connectWithoutInteraction = (metaData, user) => {
    const connectOption = metaData["coin:dashboard_connect_option"] || "connect_with_interaction";
    const sameInstitution = !isEmpty(metaData["coin:institution_guid"]) &&
        metaData["coin:institution_guid"] === user?.identityProvider?.data?.metaDataFields["coin:institution_guid"];
    return connectOption !== "connect_with_interaction" || sameInstitution;

}

export const CONSENT = {
    no_consent: "no_consent",
    minimal_consent: "minimal_consent",
    default_consent: "default_consent"
}

export const STEPUP_LEVELS = {
    loa1_5: "http://test2.surfconext.nl/assurance/loa1.5",
    loa2:   "http://test2.surfconext.nl/assurance/loa2",
    loa3:   "http://test2.surfconext.nl/assurance/loa3",
};

export const MFA_LEVELS = {
    multipleauthn:               "http://schemas.microsoft.com/claims/multipleauthn",
    mfa:                         "https://refeds.org/profile/mfa",
    mobileOneFactorContract:     "urn:oasis:names:tc:SAML:2.0:ac:classes:MobileOneFactorContract",
    mobileOneFactorUnregistered: "urn:oasis:names:tc:SAML:2.0:ac:classes:MobileOneFactorUnregistered",
    password:                    "urn:oasis:names:tc:SAML:2.0:ac:classes:Password",
    transparentAuthnContext:     "transparent_authn_context",
    linkedInstitution:           "https://eduid.nl/trust/linked-institution",
    validateNames:               "https://eduid.nl/trust/validate-names",
    validateNamesExternal:       "https://eduid.nl/trust/validate-names-external",
    affiliationStudent:          "https://eduid.nl/trust/affiliation-student",
};
