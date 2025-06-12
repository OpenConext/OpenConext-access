import {isEmpty} from "./Utils.js";

export const convertClientConnectionToServer = (application, connection, arpInfo) => {
    debugger;
    const {motivations, additionalAttributes, profile, profileMotivation} = connection;
    const currentProfile = arpInfo.profiles.find(p => p.name === profile.value);
    const selectedAttributes = currentProfile.attributes.concat(additionalAttributes);
    const attributes = arpInfo.attributes.filter(attribute => selectedAttributes.includes(attribute.name));
    const arpAttributes = attributes.reduce((acc, attr) => {
        acc[attr.urn] = [
            {
                "source": "idp",
                "value": "*",
                "motivation": motivations[attr.name] || "Default for profile"
            }
        ];
        return acc;
    }, {});
    debugger;
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
            arp: {
                attributes: arpAttributes,
                profile: currentProfile.name,
                motivation: profileMotivation
            }
        }

    };
}

export const convertServerConnectionToClient = (connection, protocolOptions, arpInfo) => {

    // if (arpInfo) {
    //     debugger;
    // }
    return {
        ...connection,
        ...connection.metaData,
        protocol: protocolOptions.find(option => option.value === connection.protocol),
        additionalAttributes: [],
        profile: {},
        motivations: {},
        profileMotivation: ""
    }

}

export const generateOIDCClientID = application => {
    const name = application.name;
    const alphanumericOnly = name.replace(/[^a-zA-Z0-9]/g, '');
    const result = alphanumericOnly.replace(/^\d+/, '').toLowerCase();
    return result + "_" + (application.connections.length + 1);
}
