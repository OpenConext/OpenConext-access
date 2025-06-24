import {isEmpty} from "./Utils.js";

export const logoSectionValid = (application) => {
    return ["logo", "descriptionEN", "descriptionNL", "webSite"]
        .every(attr => !isEmpty(application?.information?.[attr]))
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
        .every(attr => !isEmpty(application?.privacy?.[attr]))
};

//Pull the metaData of the application up in the root
export const convertServerApplicationToClient = (application) => {
    //Sensible defaults for first rendering, but override for applications already catalogized
    return {
        ...application,
        information: {},
        contactPersons: [],
        privacy: {},
        ...application.metaData

    }
}
//Push the metaData of the application to the actual JSON metaData version
export const convertClientApplicationToServer = (application) => {
    return {
        ...application,
        //Connections and memberships are created separately
        connections: null,
        applicationMemberships: null,
        metaData: {
            information: application.information,
            contactPersons: application.contactPersons,
            privacy: application.privacy
        }

    }
}