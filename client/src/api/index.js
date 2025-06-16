import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore";

//Internal API
function validateResponse(showErrorDialog) {
    return res => {
        if (!res.ok) {
            if (res.type === "opaqueredirect") {
                setTimeout(() => window.location.reload(true), 100);
                return res;
            }
            const error = new Error(res.statusText);
            error.response = res;
            if (showErrorDialog && res.status === 401) {
                window.location.reload(true);
                return;
            }
            if (showErrorDialog) {
                setTimeout(() => {
                    throw error;
                }, 250);
            }
            throw error;
        }
        return res;
    };
}

function validFetch(path, options, headers = {}, showErrorDialog = true) {

    const contentHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Accept-Language": I18n.locale,
        "X-CSRF-TOKEN": useAppStore.getState().csrfToken,
        ...headers
    };
    const fetchOptions = Object.assign({}, {headers: contentHeaders}, options, {
        credentials: "same-origin",
        redirect: "manual",
        changeOrigin: false,
    });
    return fetch(path, fetchOptions).then(validateResponse(showErrorDialog))

}

function fetchJson(path, options = {}, headers = {}, showErrorDialog = true) {
    return validFetch(path, options, headers, showErrorDialog)
        .then(res => res.json());
}

function postPutJson(path, body, method, showErrorDialog = true) {
    const jsonBody = JSON.stringify(body);
    return fetchJson(path, {method: method, body: jsonBody}, {}, showErrorDialog);
}

function fetchDelete(path) {
    return validFetch(path, {method: "delete"});
}

//Base
export function configuration() {
    return fetchJson("/api/v1/users/config");
}

export function csrf() {
    return fetchJson("/api/v1/csrf", {}, {}, false);
}

export function arp() {
    return fetchJson("/api/v1/users/arp", {}, {}, false);
}

//Users
export function me() {
    return fetchJson("/api/v1/users/me");
}

export function logout() {
    const fetchOptions = {
        credentials: "same-origin",
        redirect: "manual"
    };
    return fetchJson("/api/v1/users/logout");
}

//Organization
export function searchOrganization(query) {
    return fetchJson(`/api/v1/organizations/search?query=${query}`);
}

export function organizationById(id) {
    return fetchJson(`/api/v1/organizations/find/${id}`);
}

export function organizationLightById(id) {
    return fetchJson(`/api/v1/organizations/light/${id}`);
}

export function newOrganization(organization) {
    return postPutJson("/api/v1/organizations", organization, "POST");
}

//JoinRequest
export function newJoinRequest(joinRequest) {
    return postPutJson("/api/v1/join/", joinRequest, "POST");
}

export function joinRequestByOrganization(organization) {
    return fetchJson(`/api/v1/join/all/${organization.id}`);
}

//Applications
export function getApplicationsByOrganization(organisation) {
    return fetchJson(`/api/v1/applications/all/${organisation.id}`);
}

export function getApplicationById(applicationId) {
    return fetchJson(`/api/v1/applications/${applicationId}`);
}

export function newApplication(application) {
    return postPutJson("/api/v1/applications", application, "POST");
}

export function updateApplication(application) {
    return postPutJson("/api/v1/applications", application, "PUT");
}

//Manage
export function parseMedaData(xml) {
    return postPutJson("/api/v1/manage/parse", {xml: xml}, "POST");
}

export function parseMedaDataUrl(url) {
    return postPutJson("/api/v1/manage/parse", {url: url}, "POST");
}

export function getIdentityProviders() {
    return fetchJson("/api/v1/manage/identity-providers");
}

//Connections
export function newConnection(connection) {
    return postPutJson("/api/v1/connections", connection, "POST");
}

export function updateConnection(connection) {
    return postPutJson("/api/v1/connections", connection, "PUT");
}

export function getConnectionById(connectionId) {
    return fetchJson(`/api/v1/connections/${connectionId}`);
}



