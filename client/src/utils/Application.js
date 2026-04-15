import {isEmpty} from "./Utils.js";
import {isValidEmail, isValidUrl} from "../validations/regExps.js";
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

export const validEmailOrUrl = (contactPerson, contactType, otherSameTypeContactPersons, ignoreTechnicalConstraint) => {
    const email = contactPerson.email;
    if (contactType !== "technical" || ignoreTechnicalConstraint) {
        return isValidUrl(email) || isValidEmail(email);
    }
    if (isValidEmail(email)) {
        return true;
    }
    //One the emails must be a real email if the current is not
    if (isValidUrl(email)) {
        const otherIsValidEmail = otherSameTypeContactPersons
            .some(other => other.id !== contactPerson.id && isValidEmail(other.email));
        return otherIsValidEmail;
    }
    return false;
}


export const contactSectionValid = (application) => {
    const contactPersonsGrouped = Object.groupBy(application.contactPersons, contact => contact.type);
    return Object.values(contactPersonTypes)
        .every(contactType => {
            const contactPersons = (application?.contactPersons || []).filter(c => c.type === contactType);
            return contactPersons.every(contactPerson => !isEmpty(contactPerson?.email) &&
                validEmailOrUrl(contactPerson, contactType, contactPersonsGrouped[contactType], false));
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