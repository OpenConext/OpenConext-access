import {isEmpty} from "./Utils.js";
import {isOrganizationAdmin} from "./Permissions.js";

//Only the admin of a service provider can supply the details for the agreement, and only as long as there is no contract yet
export function showContractRequiredBanner(user, organization) {
    return !isEmpty(organization) && isEmpty(organization.manageIdentifier)
        && isOrganizationAdmin(user, organization)
        && !organization.contractSigned && !organization.contractRequested;
}

export function currentOrganizationFromUser(user, organizationId) {
    organizationId = parseInt(organizationId, 10);
    const membership = user.organizationMemberships.find(orgMembership => orgMembership.organization.id === organizationId);
    //Do not fail if the organization is not found
    if (isEmpty(user.organizationMemberships)) {
        return null;
    }
    if (isEmpty(membership)) {
        const organization = user.organizationMemberships[0].organization;
        localStorage.setItem("organization", organization.id.toString());
        return organization
    }
    return membership?.organization;

}
