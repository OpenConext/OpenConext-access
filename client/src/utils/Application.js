import {isEmpty} from "./Utils.js";
import {isValidUrl} from "../validations/regExps.js";
import {convertServerConnectionToClient} from "./Connection.js";

export const logoSectionValid = (application) => {
    return !isEmpty(application?.logoUrl) &&
        ["descriptionEN", "descriptionNL", "webSite"]
            .every(attr => !isEmpty(application?.information?.[attr])) &&
        isValidUrl(application?.information?.webSite)
};

export const contactSectionValid = (application) => {
    return ["technical", "support", "administrative"]
        .every(contactType => {
            const contactPerson = (application?.contactPersons || []).find(c => c.type === contactType);
            return !isEmpty(contactPerson?.name) && !isEmpty(contactPerson?.email);
        })
};

export const privacySectionValid = (privacyInfo, application) => {
    const requiredPrivacyAttributes = privacyInfo.filter(p => p.required);
    return requiredPrivacyAttributes
        .map(val => val.name)
        .every(attr => !isEmpty(application?.privacy?.[attr]));
};

//Pull the metaData of the application up in the root
export const convertServerApplicationToClient = (application, protocolOptions, profileOptions, arpInfo) => {
    application.metaData.contactPersons = (application.metaData.contactPersons || [])
        .map(person => ({
            type: person.type,
            email: person.email,
            name: `${person.givenName} ${person.surName}`
        }));
    const clientApplication = {
        ...application,
        connections: isEmpty(protocolOptions) ? (application.connections || []) : (application.connections || [])
            .map(con => convertServerConnectionToClient(con, protocolOptions, profileOptions, arpInfo)),
        information: {},
        contactPersons: [],
        privacy: {dpa_type: "dpa_supplied_by_service"},
        //Sensible defaults for first rendering, but override for applications already catalogized
        ...application.metaData
    };
    return clientApplication
}
//Push the metaData of the application to the actual JSON metaData version
export const convertClientApplicationToServer = (application) => {
    const serverContactPersons = application.contactPersons
        .map(person => {
            const parts = person.name.split(" ");
            //Not trivial, but SAML and Manage dictates givenName and surName
            return {
                type: person.type,
                email: person.email,
                givenName: parts[0],
                surName: parts.slice(1).join(" ")
            }
        })
    return {
        ...application,
        //Connections and memberships are created separately
        connections: null,
        applicationMemberships: null,
        metaData: {
            information: application.information,
            contactPersons: serverContactPersons,
            privacy: application.privacy
        }

    }
}