import {isEmpty} from "./Utils.js";

export function currentOrganizationFromUser(user, organizationId) {
    organizationId = parseInt(organizationId, 10);
    const membership = user.organizationMemberships.find(orgMembership => orgMembership.organization.id === organizationId);
    //Do not fail if the organization is not found
    if (isEmpty(membership)) {
        const organization = user.organizationMemberships[0].organization;
        localStorage.setItem("organization", organization.id.toString());
        return organization
    }
    return membership?.organization;

}
