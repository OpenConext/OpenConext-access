import {isEmpty, sanitizeURL} from "./Utils.js";
import {dictToQueryString} from "./QueryParameters.js";

export const SESSION_STORAGE_LOCATION = "session_storage_location";

const LOGGED_OUT_KEY = "explicitly_logged_out";

export const markExplicitLogout = () => {
    try {
        localStorage.setItem(LOGGED_OUT_KEY, "true");
    } catch {
        // storage unavailable, fall back to SSO
    }
}

const consumeExplicitLogout = () => {
    try {
        const loggedOut = localStorage.getItem(LOGGED_OUT_KEY) === "true";
        localStorage.removeItem(LOGGED_OUT_KEY);
        return loggedOut;
    } catch {
        return false;
    }
}

// Force re-authentication (no SSO) only once after the user explicitly logged out
export const login = (config, useEduID = false, upgradeLoa = false) => {
    const force = consumeExplicitLogout();
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
