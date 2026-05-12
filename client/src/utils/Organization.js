export function currentOrganizationFromUser(user, organizationId) {
    organizationId = parseInt(organizationId, 10);
    const membership = user.organizationMemberships.find(orgMembership => orgMembership.organization.id === organizationId);
    //Deliberate fail when the organization is not found, will be handled in try / catch, navigat("404")
    return membership.organization;

}