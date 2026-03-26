import {isEmpty} from "./Utils.js";
import {isValidUrl} from "../validations/regExps.js";
import {convertServerConnectionToClient} from "./Connection.js";

const parseContactPersonIdentifier = input => {
    if (input.startsWith("http")) {
        const {hostname} = new URL(input);
        return hostname.replace(/^www\./, '');
    }
    return input.split('@')[0];
}

export const contactPersonTypes = {
    administrative: "administrative", technical: "technical", support: "support"
}

export const logoSectionValid = (application) => {
    return !isEmpty(application?.logoUrl) &&
        ["descriptionEN", "descriptionNL", "webSite"]
            .every(attr => !isEmpty(application?.information?.[attr])) &&
        isValidUrl(application?.information?.webSite)
};

export const contactSectionValid = (application) => {
    return Object.values(contactPersonTypes)
        .every(contactType => {
            const contactPerson = (application?.contactPersons || []).find(c => c.type === contactType);
            return !isEmpty(contactPerson?.email);
        })
};

export const privacySectionValid = (privacyInfo, application) => {
    const requiredPrivacyAttributes = privacyInfo.filter(p => p.required);
    const formatPrivacyAttributes = privacyInfo.filter(p => p.format);
    const invalidUrls = formatPrivacyAttributes
        .map(val => val.name)
        .some(attr => !isValidUrl(application?.privacy?.[attr]));
    return requiredPrivacyAttributes
        .map(val => val.name)
        .every(attr => !isEmpty(application?.privacy?.[attr])) && !invalidUrls;
};

//Pull the metaData of the application up in the root
export const convertServerApplicationToClient = (application, protocolOptions, profileOptions, arpInfo) => {
    application.metaData.contactPersons = (application.metaData.contactPersons || [])
        .map(person => {
            return {
                type: person.type,
                email: person.email,
                id: crypto.randomUUID()
            }
        });
    if (isEmpty(application.metaData.contactPersons)) {
        application.metaData.contactPersons = Object.keys(contactPersonTypes).map(typeContact => ({
            type: typeContact,
            id: crypto.randomUUID(),
            email: "",
        }));
    }
    const newApplication = {
        ...application,
        connections: isEmpty(protocolOptions) ? (application.connections || []) : (application.connections || [])
            .map(con => convertServerConnectionToClient(con, protocolOptions, profileOptions, arpInfo)),
        information: {},
        contactPersons: [],
        privacy: {dpa_type: "dpa_supplied_by_service"},
        //Sensible defaults for first rendering, but override for applications already catalogized
        ...application.metaData
    };
    return newApplication;
}
//Push the metaData of the application to the actual JSON metaData version
export const convertClientApplicationToServer = (application) => {
    const serverContactPersons = application.contactPersons
        .map(person => {
            //Not trivial, but SAML and ManageImport dictates givenName and surName
            const givenName = parseContactPersonIdentifier(person.email);
            return {
                type: person.type,
                email: person.email,
                givenName: givenName,
                surName: person.type
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