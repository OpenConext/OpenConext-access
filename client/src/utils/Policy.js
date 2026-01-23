export const policyTemplate = (identityProviderEntityId, serviceProviderEntityId) => ({
    "active": true,
    "allAttributesMustMatch": false,
    "attributes": [{name: null, value: ""}],
    "denyAdvice": "",
    "denyAdviceNl": "",
    "denyRule": false,
    "description": "",
    "entityid": "",
    "identityProviderIds": [{name: identityProviderEntityId}],
    "metaDataFields": {},
    "name": "",
    "serviceProviderIds": [{name: serviceProviderEntityId}],
    "type": "reg"
})