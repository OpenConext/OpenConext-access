//Deliberate design choice to have a different format on the server to have all complex data in the metaData attribute
import {isEmpty} from "./Utils.js";

export const convertClientConnectionToServer = (application, connection, arpInfo) => {

    const {motivations, additionalAttributes, profile, profileMotivation} = connection;
    const currentProfile = arpInfo.profiles.find(p => p.name === profile.value);
    const selectedAttributes = currentProfile.attributes.concat(additionalAttributes);
    const attributes = arpInfo.attributes.filter(attribute => selectedAttributes.includes(attribute.name));
    const arpAttributes = attributes.reduce((acc, attr) => {
        acc[attr.urn] = [
            {
                "source": attr.overrideSource || "idp",
                "value": "*",
                "motivation": motivations[attr.name] || "Default for profile"
            }
        ];
        return acc;
    }, {});
    return {
        ...connection,
        application: {id: application.id},
        protocol: connection.protocol.value,
        metaData: {
            redirectUrls: connection.redirectUrls,
            entityID: connection.entityID,
            grantTypes: connection.grantTypes,
            acsLocations: connection.acsLocations,
            contactPersons: connection.contactPersons,
            allowedEntities: connection.allowedEntities,
            pkce: connection.pkce,
            secret: connection.secret,
            visibility: connection.visibility,
            connectOption: connection.connectOption,
            refreshTokenValidity: connection.refreshTokenValidity,
            claimsInIdToken: connection.claimsInIdToken,
            arp: {
                attributes: arpAttributes,
                profile: currentProfile.name,
                motivation: profileMotivation,
                enabled: true
            }
        }

    };
}
//Deliberate design choice to have a different format on the client to have all complex data in the connection attribute
export const convertServerConnectionToClient = (connection, protocolOptions, profileOptions, arpInfo) => {
    const {arp} = connection.metaData;
    const {profile, attributes, motivation} = arp;
    const protocol = protocolOptions.find(option => option.value === connection.protocol);
    const profileAttributesNames = arpInfo.profiles.find(p => p.name === profile).attributes;
    const profileAttributes = arpInfo.attributes.filter(attr => profileAttributesNames.includes(attr.name));
    const profileAttributesUrns = profileAttributes.map(attr => attr.urn);
    //Find all attributes in the metadata that are not in the default array
    const additionalAttributesUrns = Object.keys(attributes)
        .filter(attr => !profileAttributesUrns.includes(attr))
    const additionalAttributes = arpInfo.attributes.filter(attr => additionalAttributesUrns.includes(attr.urn));
    const additionalAttributesNames = additionalAttributes.map(attr => attr.name);
    const motivations = additionalAttributesUrns
        .reduce((acc, urn) => {
            const attribute = additionalAttributes.find(attr => attr.urn === urn);
            const attrMotivation = attributes[urn][0].motivation;
            acc[attribute.name] = isEmpty(attrMotivation) ? `Need ${attribute.name}` : attrMotivation;
            return acc;
        }, {})
    const profileOption = profileOptions.find(option => option.value === profile);
    return {
        ...connection,
        ...connection.metaData,
        protocol: protocol,
        additionalAttributes: additionalAttributesNames,
        profile: profileOption,
        motivations: motivations,
        profileMotivation: motivation
    }
}

export const generateOIDCClientID = () => {
    return "SURFACCESS-" + crypto.randomUUID();
}

export const visibilities = {
    visible_to_all: "visible_to_all",
    visible_to_idp_only: "visible_to_idp_only",
    visible_to_none: "visible_to_none"
};

export const connectOptions = {
    connect_with_interaction: "connect_with_interaction",
    connect_without_interaction_with_email: "connect_without_interaction_with_email",
    connect_without_interaction_without_email: "connect_without_interaction_without_email"
}

