const createIdPOption = (locale, idp) => {
    const metaData = idp.data.metaDataFields;
    const name = locale === "en" ? metaData["name:en"] : metaData["name:nl"] || metaData["name:en"];
    const organization = locale === "en" ? metaData["OrganizationName:en"] : metaData["OrganizationName:nl"] || metaData["OrganizationName:en"];
    return {label: `${name} (${organization})`, value: idp.data.entityid}
}

export const identityProviderOption = (identityProviders, entityId, locale) => {
    const idp = identityProviders.find(entity => entity.data.entityid === entityId);
    return createIdPOption(locale, idp);
}

export const identityProviderOptions = (identityProviders, locale) => {
    return identityProviders.map(idp => createIdPOption(locale, idp))
}

export const PROTOCOLS = {
    OIDC10_RP: "oidc10_rp", SAML20_SP: "saml20_sp"
}

export const CONNECTION_STATUSES = {
    OPEN: "OPEN", COMPLETE: "COMPLETE", PENDING_PROD: "PENDING_PROD", PROD_READY: "PROD_READY"
}

export const APPLICATION_STATUSES = {
    OPEN: "OPEN", COMPLETE: "COMPLETE"
}

export const ENVIRONMENTS = {
    TEST: "TEST", PROD: "PROD"
}