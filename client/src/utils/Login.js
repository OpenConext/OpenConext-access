import {isEmpty, sanitizeURL} from "./Utils.js";

export const SESSION_STORAGE_LOCATION = "session_storage_location";

export const login = (config, force = true, useEduID = false) => {
    let params = force ? "?force=true" : "";
    if (useEduID) {
        params += (force ? "&eduId=true" : "?eduId=true");
    }
    let serverUrl = config.serverUrl;
    if (isEmpty(serverUrl)) {
        const local = window.location.hostname === "localhost";
        serverUrl = local ? "http://localhost:8886" :
            `${window.location.protocol}//${window.location.host}`
    }
    window.location.href = sanitizeURL(`${serverUrl}/api/v1/users/login${params}`);
}
