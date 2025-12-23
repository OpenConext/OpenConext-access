import {isEmpty, sanitizeURL} from "./Utils.js";
import {dictToQueryString} from "./QueryParameters.js";

export const SESSION_STORAGE_LOCATION = "session_storage_location";

export const login = (config, force = true, useEduID = false, upgradeLoa = false) => {
    const params = {
        force: force ? "true" : null,
        eduId: useEduID ? "true" : null,
        upgradeLoa: upgradeLoa ? "true" : null
    }
    let serverUrl = config.serverUrl;
    const queryString = dictToQueryString(params);
    if (isEmpty(serverUrl)) {
        const local = window.location.hostname === "localhost";
        serverUrl = local ? "http://localhost:8886" :
            `${window.location.protocol}//${window.location.host}`
    }
    window.location.href = sanitizeURL(`${serverUrl}/api/v1/users/login?${queryString}`);
}
