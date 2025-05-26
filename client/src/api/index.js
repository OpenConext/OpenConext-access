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

//Manage
export function getApplications(organisation) {
    return fetchJson(`/api/v1/applications/applications/${organisation.id}`);
}

export function parseMedaData(xml) {
    return postPutJson("/api/v1/manage/parse", {xml: xml}, "POST");
}

export function parseMedaDataUrl(url) {
    return postPutJson("/api/v1/manage/parse", {url: url}, "POST");
}

