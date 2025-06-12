export const convertClientConnectionToServer = connection => {
    return {
        ...connection,
        protocol: connection.protocol.value,
        metaData: {
            redirectUrls: connection.redirectUrls,
            entityID: connection.entityID,
            grantTypes: connection.grantTypes,
            acsLocations: connection.acsLocations,
            contactPersons: connection.contactPersons,
        }
    };
}

export const convertServerConnectionToClient = (connection, protocolOptions) => {
    return {
        ...connection,
        ...connection.metaData,
        protocol: protocolOptions.find(option => option.value === connection.protocol)
    }

}

export const generateOIDCClientID = application => {
    const name = application.name;
    const alphanumericOnly = name.replace(/[^a-zA-Z0-9]/g, '');
    const result = alphanumericOnly.replace(/^\d+/, '').toLowerCase();
    return result + "_" + (application.connections.length + 1);
}
