import {expect, test} from 'vitest'
import {
    authorities,
    currentUserMembershipAuthority,
    deriveAccess,
    getOrganizationMembership,
    hasApplicationDeleteAccess,
    hasApplicationMembershipDeleteAccess,
    hasApplicationWriteAccess,
    hasCreateApplicationAccess,
    hasPolicyWriteAccess,
    isAdmin,
    isOrganizationAdmin,
    isOrganizationMember,
    policyServiceProvider
} from "../../utils/Permissions.js";

const organization = {id: 1};
const otherOrganization = {id: 2};

const membership = (org, authority) => ({organization: org, authority: authority});

const user = (superUser, organizationMemberships) => ({
    id: 1,
    superUser: superUser,
    organizationMemberships: organizationMemberships
});

test("Test getOrganizationMembership found", () => {
    const adminMembership = membership(organization, authorities.ADMIN);
    const currentUser = user(false, [adminMembership, membership(otherOrganization, authorities.MEMBER)]);

    const result = getOrganizationMembership(currentUser, organization, authorities.ADMIN);
    expect(result).toEqual(adminMembership);
});

test("Test getOrganizationMembership not found", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);

    const result = getOrganizationMembership(currentUser, organization, authorities.ADMIN);
    expect(result).toBeUndefined();
});

test("Test isOrganizationAdmin true", () => {
    const currentUser = user(false, [membership(organization, authorities.ADMIN)]);

    expect(isOrganizationAdmin(currentUser, organization)).toBe(true);
});

test("Test isOrganizationAdmin false", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);

    expect(isOrganizationAdmin(currentUser, organization)).toBe(false);
});

test("Test isOrganizationMember true", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);

    expect(isOrganizationMember(currentUser, organization)).toBe(true);
});

test("Test isOrganizationMember false", () => {
    const currentUser = user(false, [membership(organization, authorities.GUEST)]);

    expect(isOrganizationMember(currentUser, organization)).toBe(false);
});

test("Test currentUserMembershipAuthority super user", () => {
    const currentUser = user(true, []);

    expect(currentUserMembershipAuthority(currentUser, undefined)).toEqual(authorities.ADMIN);
});

test("Test currentUserMembershipAuthority admin membership", () => {
    const currentUser = user(false, []);
    const adminMembership = membership(organization, authorities.ADMIN);

    expect(currentUserMembershipAuthority(currentUser, adminMembership)).toEqual(authorities.ADMIN);
});

test("Test currentUserMembershipAuthority member membership", () => {
    const currentUser = user(false, []);
    const memberMembership = membership(organization, authorities.MEMBER);

    expect(currentUserMembershipAuthority(currentUser, memberMembership)).toEqual(authorities.MEMBER);
});

test("Test currentUserMembershipAuthority no membership defaults to guest", () => {
    const currentUser = user(false, []);

    expect(currentUserMembershipAuthority(currentUser, undefined)).toEqual(authorities.GUEST);
});

test("Test currentUserMembershipAuthority guest membership defaults to guest", () => {
    const currentUser = user(false, []);
    const guestMembership = membership(organization, authorities.GUEST);

    expect(currentUserMembershipAuthority(currentUser, guestMembership)).toEqual(authorities.GUEST);
});

test("Test hasApplicationWriteAccess super user", () => {
    const currentUser = user(true, []);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};

    expect(hasApplicationWriteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationWriteAccess no organization membership", () => {
    const currentUser = user(false, []);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};

    expect(hasApplicationWriteAccess(currentUser, application)).toBe(false);
});

test("Test hasApplicationWriteAccess org admin", () => {
    const currentUser = user(false, [membership(organization, authorities.ADMIN)]);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};

    expect(hasApplicationWriteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationWriteAccess member owner of the application", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {id: 10, organization: organization, ownerIdentifier: 1};

    expect(hasApplicationWriteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationWriteAccess member with an application membership", () => {
    const memberMembership = membership(organization, authorities.MEMBER);
    memberMembership.applicationMemberships = [{applicationIdentifier: 10}];
    const currentUser = user(false, [memberMembership]);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};

    expect(hasApplicationWriteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationWriteAccess member without access", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};

    expect(hasApplicationWriteAccess(currentUser, application)).toBe(false);
});

test("Test hasApplicationMembershipDeleteAccess super user", () => {
    const currentUser = user(true, []);
    const application = {organization: organization, ownerIdentifier: 999};
    const guestMembership = {authority: authorities.GUEST};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, guestMembership)).toBe(true);
});

test("Test hasApplicationMembershipDeleteAccess no organization membership", () => {
    const currentUser = user(false, []);
    const application = {organization: organization, ownerIdentifier: 999};
    const guestMembership = {authority: authorities.GUEST};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, guestMembership)).toBe(false);
});

test("Test hasApplicationMembershipDeleteAccess org admin can always delete", () => {
    const currentUser = user(false, [membership(organization, authorities.ADMIN)]);
    const application = {organization: organization, ownerIdentifier: 999};
    const guestMembership = {authority: authorities.GUEST};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, guestMembership)).toBe(true);
});

test("Test hasApplicationMembershipDeleteAccess member owner of the application can delete a guest", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {organization: organization, ownerIdentifier: 1};
    const guestMembership = {authority: authorities.GUEST};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, guestMembership)).toBe(true);
});

test("Test hasApplicationMembershipDeleteAccess member not owner of the application cannot delete a guest", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {organization: organization, ownerIdentifier: 999};
    const guestMembership = {authority: authorities.GUEST};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, guestMembership)).toBe(false);
});

test("Test hasApplicationMembershipDeleteAccess member deleting a non-guest falls back to write access", () => {
    const memberMembership = membership(organization, authorities.MEMBER);
    memberMembership.applicationMemberships = [{applicationIdentifier: 10}];
    const currentUser = user(false, [memberMembership]);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};
    const otherMemberMembership = {authority: authorities.MEMBER};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, otherMemberMembership)).toBe(true);
});

test("Test hasApplicationMembershipDeleteAccess member deleting a non-guest without write access", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {id: 10, organization: organization, ownerIdentifier: 999};
    const otherMemberMembership = {authority: authorities.MEMBER};

    expect(hasApplicationMembershipDeleteAccess(currentUser, application, otherMemberMembership)).toBe(false);
});

test("Test hasApplicationDeleteAccess super user", () => {
    const currentUser = user(true, []);
    const application = {organization: organization, ownerIdentifier: 999};

    expect(hasApplicationDeleteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationDeleteAccess no organization membership", () => {
    const currentUser = user(false, []);
    const application = {organization: organization, ownerIdentifier: 999};

    expect(hasApplicationDeleteAccess(currentUser, application)).toBe(false);
});

test("Test hasApplicationDeleteAccess org admin", () => {
    const currentUser = user(false, [membership(organization, authorities.ADMIN)]);
    const application = {organization: organization, ownerIdentifier: 999};

    expect(hasApplicationDeleteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationDeleteAccess member owner of the application", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {organization: organization, ownerIdentifier: 1};

    expect(hasApplicationDeleteAccess(currentUser, application)).toBe(true);
});

test("Test hasApplicationDeleteAccess member not owner of the application", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);
    const application = {organization: organization, ownerIdentifier: 999};

    expect(hasApplicationDeleteAccess(currentUser, application)).toBe(false);
});

test("Test hasApplicationDeleteAccess guest owner of the application is still denied", () => {
    const currentUser = user(false, [membership(organization, authorities.GUEST)]);
    const application = {organization: organization, ownerIdentifier: 1};

    expect(hasApplicationDeleteAccess(currentUser, application)).toBe(false);
});

test("Test deriveAccess external user without identity provider", () => {
    const currentOrganization = {identityProvider: null};

    const result = deriveAccess(currentOrganization, "https://sp.example.com");
    expect(result).toEqual({isAccessible: false, isReadOnly: false, isPendingDisconnect: false});
});

test("Test deriveAccess accessible entity", () => {
    const currentOrganization = {
        identityProvider: {data: {allowedEntities: [{name: "https://sp.example.com"}]}},
        changeRequests: []
    };

    const result = deriveAccess(currentOrganization, "https://sp.example.com");
    expect(result.isAccessible).toBe(true);
    expect(result.isReadOnly).toBe(false);
    expect(result.isPendingDisconnect).toBe(false);
});

test("Test deriveAccess inaccessible entity without pending change requests", () => {
    const currentOrganization = {
        identityProvider: {data: {allowedEntities: []}},
        changeRequests: []
    };

    const result = deriveAccess(currentOrganization, "https://sp.example.com");
    expect(result.isAccessible).toBe(false);
    expect(result.isReadOnly).toBe(true);
    expect(result.isPendingDisconnect).toBe(false);
    expect(result.ticketKey).toBeNull();
});

test("Test deriveAccess inaccessible entity with pending link request", () => {
    const currentOrganization = {
        identityProvider: {data: {allowedEntities: []}},
        changeRequests: [{
            requestType: "LinkRequest",
            pathUpdateType: "ADDITION",
            pathUpdates: {allowedEntities: {name: "https://sp.example.com"}},
            ticketKey: "JIRA-123"
        }]
    };

    const result = deriveAccess(currentOrganization, "https://sp.example.com");
    expect(result.isAccessible).toBe(true);
    expect(result.isReadOnly).toBe(true);
    expect(result.ticketKey).toEqual("JIRA-123");
});

test("Test deriveAccess accessible entity with pending unlink request", () => {
    const currentOrganization = {
        identityProvider: {data: {allowedEntities: [{name: "https://sp.example.com"}]}},
        changeRequests: [{
            requestType: "UnlinkRequest",
            pathUpdateType: "REMOVAL",
            pathUpdates: {allowedEntities: {name: "https://sp.example.com"}},
            ticketKey: "JIRA-456"
        }]
    };

    const result = deriveAccess(currentOrganization, "https://sp.example.com");
    expect(result.isAccessible).toBe(true);
    expect(result.isPendingDisconnect).toBe(true);
    expect(result.ticketKey).toEqual("JIRA-456");
});

test("Test isAdmin external user without identity provider", () => {
    const currentUser = user(false, []);
    const currentOrganization = {id: 1, identityProvider: null};

    expect(isAdmin(currentUser, currentOrganization, authorities)).toBe(false);
});

test("Test isAdmin super user", () => {
    const currentUser = user(true, []);
    const currentOrganization = {id: 1, identityProvider: {data: {}}};

    expect(isAdmin(currentUser, currentOrganization, authorities)).toBe(true);
});

test("Test isAdmin org admin membership", () => {
    const currentOrganization = {id: 1, identityProvider: {data: {}}};
    const currentUser = user(false, [membership(currentOrganization, authorities.ADMIN)]);

    expect(isAdmin(currentUser, currentOrganization, authorities)).toBe(true);
});

test("Test isAdmin org member membership is not admin", () => {
    const currentOrganization = {id: 1, identityProvider: {data: {}}};
    const currentUser = user(false, [membership(currentOrganization, authorities.MEMBER)]);

    expect(isAdmin(currentUser, currentOrganization, authorities)).toBe(false);
});

test("Test hasCreateApplicationAccess no membership", () => {
    const currentUser = user(false, []);

    expect(hasCreateApplicationAccess(currentUser, organization)).toBe(false);
});

test("Test hasCreateApplicationAccess guest membership", () => {
    const currentUser = user(false, [membership(organization, authorities.GUEST)]);

    expect(hasCreateApplicationAccess(currentUser, organization)).toBe(false);
});

test("Test hasCreateApplicationAccess member membership", () => {
    const currentUser = user(false, [membership(organization, authorities.MEMBER)]);

    expect(hasCreateApplicationAccess(currentUser, organization)).toBe(true);
});

test("Test hasCreateApplicationAccess admin membership", () => {
    const currentUser = user(false, [membership(organization, authorities.ADMIN)]);

    expect(hasCreateApplicationAccess(currentUser, organization)).toBe(true);
});

test("Test hasPolicyWriteAccess without identity providers", () => {
    const currentUser = user(false, []);
    const application = {connections: []};

    expect(hasPolicyWriteAccess(currentUser, application, [])).toBe(false);
});

test("Test hasPolicyWriteAccess owns all service and identity providers", () => {
    const currentUser = user(false, [{
        organization: {identityProvider: {data: {entityid: "https://idp.example.com"}}}
    }]);
    const application = {connections: [{metaData: {entityID: "https://sp.example.com"}}]};
    const policies = [{
        identityProviderIds: [{name: "https://idp.example.com"}],
        serviceProviderIds: [{name: "https://sp.example.com"}]
    }];

    expect(hasPolicyWriteAccess(currentUser, application, policies)).toBe(true);
});

test("Test hasPolicyWriteAccess does not own all service providers", () => {
    const currentUser = user(false, [{
        organization: {identityProvider: {data: {entityid: "https://idp.example.com"}}}
    }]);
    const application = {connections: [{metaData: {entityID: "https://sp.example.com"}}]};
    const policies = [{
        identityProviderIds: [{name: "https://idp.example.com"}],
        serviceProviderIds: [{name: "https://other-sp.example.com"}]
    }];

    expect(hasPolicyWriteAccess(currentUser, application, policies)).toBe(false);
});

test("Test policyServiceProvider", () => {
    const policies = [{serviceProviderIds: [{name: "https://sp.example.com"}]}];

    expect(policyServiceProvider(policies)).toEqual("https://sp.example.com");
});
