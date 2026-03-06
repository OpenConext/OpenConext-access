import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore";
import {paginationQueryParams} from "../utils/Pagination.js";
import {isEmpty} from "../utils/Utils.js";

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
    const impersonator = useAppStore.getState().impersonator;
    if (impersonator) {
        contentHeaders["X-IMPERSONATE-ID"] = useAppStore.getState().user.id.toString();
    }
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

export function deleteUser() {
    return fetchDelete("/api/v1/users");
}


export function logout() {
    return fetchJson("/api/v1/users/logout");
}

export function searchUsers(pagination = {}) {
    const queryPart = paginationQueryParams(pagination, {})
    return fetchJson(`/api/v1/users/search?${queryPart}`);
}

export function feedback(message) {
    return postPutJson("/api/v1/users/feedback", {message: message}, "POST");
}

export function sendFeedback(formData) {
    return postPutJson("/api/v1/feedback", formData, "POST");
}

//Organizations

//attributePaths = {"organizationMemberships.user", "invitations.invitee", "joinRequests.user"}
export function organizationUserManagementById(id) {
    return fetchJson(`/api/v1/organizations/details/${id}`);
}

//attributePaths = {"applications.connections"}
export function organizationApplicationsById(id) {
    return fetchJson(`/api/v1/organizations/applications/${id}`);
}

//no extra attributes, but with the metadata from manage (if internal organization)
export function organizationMineById(id) {
    return fetchJson(`/api/v1/organizations/mine/${id}`);
}

//attributePaths = {"organizationMemberships.user"}
export function organizationUsersById(id) {
    return fetchJson(`/api/v1/organizations/users/${id}`);
}

//no extra relations fetched, just plain attributes
export function organizationLightById(id) {
    return fetchJson(`/api/v1/organizations/light/${id}`);
}

export function searchOrganizations(pagination = {}) {
    const queryPart = paginationQueryParams(pagination, {})
    return fetchJson(`/api/v1/organizations/search?${queryPart}`);
}

export function searchOrganizationsLandingPage(query) {
    return fetchJson(`/api/v1/organizations/search-landing?query=${encodeURIComponent(query)}`);
}

export function pendingApprovalOrganizations() {
    return fetchJson("/api/v1/organizations/status/pending");
}

export function deleteOrganizationById(organizationId) {
    return fetchDelete(`/api/v1/organizations/${organizationId}`);
}

export function organizationForInvitationById(id) {
    return fetchJson(`/api/v1/organizations/invitation/${id}`);
}

export function newOrganization(organization) {
    return postPutJson("/api/v1/organizations", organization, "POST");
}

export function updateOrganizationStatus(organizationId, newStatus) {
    return postPutJson(`/api/v1/organizations/status/${organizationId}/${newStatus}`, {}, "PUT");
}

export function updateOrganizationName(organizationId, newName) {
    return postPutJson("/api/v1/organizations", {id: organizationId, name: newName}, "PUT");
}

export function updateOrganizationMetaData(organizationId, metaData) {
    return postPutJson(`/api/v1/organizations/metadata/${organizationId}`, metaData, "PUT");
}

export function identityProvidersByUsedConnectionsForOrganization(organizationId) {
    return fetchJson(`/api/v1/organizations/identity-providers-allowed-connections/${organizationId}`);
}

//JoinRequest
export function newJoinRequest(joinRequest) {
    return postPutJson("/api/v1/join/", joinRequest, "POST");
}

export function approvalJoinRequest(joinRequestId, approved, authority) {
    const body = {joinRequestId, approved, authority};
    return postPutJson("/api/v1/join/approval", body, "PUT");
}

export function getApplicationById(applicationId) {
    return fetchJson(`/api/v1/applications/${applicationId}`);
}

export function deleteApplicationById(applicationId) {
    return fetchDelete(`/api/v1/applications/${applicationId}`);
}

export function newApplication(application) {
    return postPutJson("/api/v1/applications", application, "POST");
}

export function updateApplication(application) {
    return postPutJson("/api/v1/applications", application, "PUT");
}

export function identityProvidersByUsedConnectionsForApplication(applicationId) {
    return fetchJson(`/api/v1/applications/identity-providers-allowed-connections/${applicationId}`);
}

//Application memberships
export function deleteApplicationMembershipById(applicationMembership) {
    return fetchDelete(`/api/v1/application_memberships/${applicationMembership.id}`);
}

export function createApplicationMembership(organizationMembershipId, applicationId, organizationId) {
    const body = {organizationMembershipId, applicationId, organizationId}
    return postPutJson("/api/v1/application_memberships", body, "POST");
}

//Manage
export function revokeChangeRequest(changeRequest) {
    return postPutJson("/api/v1/manage/reject-change-request", changeRequest, "PUT");
}

export function parseMedaData(xml) {
    return postPutJson("/api/v1/manage/parse", {xml: xml}, "POST");
}

export function parseMedaDataUrl(url) {
    return postPutJson("/api/v1/manage/parse", {url: url}, "POST");
}

export function getIdentityProviders(environment) {
    return fetchJson(`/api/v1/manage/identity-providers/${environment}`);
}

export function getPolicyByServiceProviderEntityId(entityId) {
    return fetchJson(`/api/v1/manage/policies?entityId=${encodeURIComponent(entityId)}`);
}

export function getPolicyByIdentityProvider() {
    return fetchJson("/api/v1/manage/identity-provider/policies");
}

export function uniqueEntityID(environment, entityID) {
    return postPutJson(`/api/v1/manage/unique-entity-id/${environment}`, {entityID: entityID}, "POST");
}

export function arp() {
    return fetchJson("/api/v1/manage/arp", {}, {}, false);
}

export function privacy() {
    return fetchJson("/api/v1/manage/privacy", {}, {}, false);
}

export function newPolicy(policy) {
    return postPutJson("/api/v1/manage/policies", policy, "POST");
}

export function updatePolicy(policy) {
    return postPutJson("/api/v1/manage/policies", policy, "PUT");
}

export function uniquePolicyName(name) {
    return postPutJson("/api/v1/manage/unique-policy-name", {name:name}, "POST");
}

export function deletePolicy(policy) {
    return fetchDelete(`/api/v1/manage/policies/${policy.id}`);
}

export function allowedAttributes() {
    return fetchJson("/api/v1/manage/allowed-attributes", {}, {}, false);
}

//Connections
export function newConnection(connection) {
    return postPutJson("/api/v1/connections", connection, "POST");
}

export function updateConnection(connection) {
    return postPutJson("/api/v1/connections", connection, "PUT");
}

export function resetConnectionSecret(connectionId) {
    return postPutJson(`/api/v1/connections/reset-secret/${connectionId}`, {}, "PUT");
}

export function getConnectionById(connectionId) {
    return fetchJson(`/api/v1/connections/${connectionId}`);
}

export function deleteConnectionById(connectionId) {
    return fetchDelete(`/api/v1/connections/${connectionId}`);
}

export function requestConnectionProductionStatus(connectionId) {
    return postPutJson(`/api/v1/connections/request-production-status/${connectionId}`, {}, "PUT");
}

export function identityProvidersByUsedConnection(connectionId) {
    return fetchJson(`/api/v1/connections/identity-providers-allowed-connections/${connectionId}`);
}

//OrganizationMemberships
export function changeOrganizationMembershipById(organizationMembership, authority) {
    const body = {id: organizationMembership.id, authority: authority}
    return postPutJson("/api/v1/organization_memberships", body, "PUT");
}

export function deleteOrganizationMembershipById(organizationMembership) {
    return fetchDelete(`/api/v1/organization_memberships/${organizationMembership.id}`);
}

//Invitations
export function createInvitation(invitation) {
    return postPutJson("/api/v1/invitations", invitation, "POST")
}

export function getInvitationByHash(hash) {
    return fetchJson(`/api/v1/invitations/hash?hash=${hash}`, {}, {}, false);
}

export function acceptInvitation(invitation) {
    const body = {hash: invitation.hash, invitationId: invitation.id}
    return postPutJson("/api/v1/invitations/accept", body, "PUT")
}

export function resendInvitation(invitation) {
    return postPutJson(`/api/v1/invitations/resend/${invitation.id}`, {}, "PUT")
}

export function deleteInvitation(invitation) {
    return fetchDelete(`/api/v1/invitations/${invitation.id}`)
}

export function deleteAllInvitations(organization) {
    return fetchDelete(`/api/v1/invitations/delete/all/${organization.id}`)
}

//IdentityProvider
export function connectServiceProviderToIdentityProvider(applicationManageIdentifier, entityType, idpManageIdentifier, message) {
    const body = {
        applicationManageIdentifier: applicationManageIdentifier,
        entityType: entityType,
        idpManageIdentifier: idpManageIdentifier,
        message
    };
    return postPutJson("/api/v1/idp/connect", body, "PUT")
}

export function disconnectServiceProviderToIdentityProvider(applicationManageIdentifier, entityType, idpManageIdentifier, message) {
    const body = {
        applicationManageIdentifier: applicationManageIdentifier,
        entityType: entityType,
        idpManageIdentifier: idpManageIdentifier,
        message
    };
    return postPutJson("/api/v1/idp/disconnect", body, "PUT")
}

export function cancelServiceProviderConnectionRequest(applicationManageIdentifier, entityType, idpManageIdentifier, message) {
    const body = {
        applicationManageIdentifier: applicationManageIdentifier,
        entityType: entityType,
        idpManageIdentifier: idpManageIdentifier,
        message
    };
    return postPutJson("/api/v1/idp/cancel-connection-request", body, "PUT")
}

export function cancelServiceProviderDisconnectionRequest(applicationManageIdentifier, entityType, idpManageIdentifier, message) {
    const body = {
        applicationManageIdentifier: applicationManageIdentifier,
        entityType: entityType,
        idpManageIdentifier: idpManageIdentifier,
        message
    };
    return postPutJson("/api/v1/idp/cancel-disconnection-request", body, "PUT")
}

//External Invite Proxy
export function inviteRoles(organizationGUID, applicationManageId) {
    return fetchJson(`/api/v1/invite/roles/${organizationGUID}/${applicationManageId}`);
}

//Public
export function publicIdentityProviders() {
    return fetchJson("/api/v1/public/identity-providers");
}

export function publicServiceProviders() {
    return fetchJson("/api/v1/public/service-providers");
}

export function publicServiceProviderByDetail(type, identifier) {
    return fetchJson(`/api/v1/public/service-provider-detail/${type}/${identifier}`);
}

//Stats
export function loginTimeFrame(from, to, scale, spEntityId) {
    const sp = !isEmpty(spEntityId) ? `&spEntityId=${encodeURIComponent(spEntityId)}` : ''
    return fetchJson(`/api/v1/stats/loginTimeFrame?from=${from}&to=${to}&scale=${scale}&${sp}`)
}

export function loginAggregated(period, spEntityId) {
    const sp = !isEmpty(spEntityId) ? `&spEntityId=${encodeURIComponent(spEntityId)}` : ''
    return fetchJson(`/api/v1/stats/loginAggregated?period=${period}${sp}`)
}

export function uniqueLoginCount(from, to, spEntityId) {
    return fetchJson(`/api/v1/stats/uniqueLoginCount?from=${from}&to=${to}&spEntityId=${encodeURIComponent(spEntityId)}`)
}
