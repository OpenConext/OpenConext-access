import {isEmpty} from "./Utils.js";
import {CHANGE_REQUEST_TYPE} from "./Manage.js";

export const authorities = {
    SUPER_USER: "SUPER_USER",
    ADMIN: "ADMIN",
    MEMBER: "MEMBER",
    GUEST: "GUEST"
}

export const authorityWeights = {
    [authorities.SUPER_USER]: 4,
    [authorities.ADMIN]: 3,
    [authorities.MEMBER]: 2,
    [authorities.GUEST]: 1
}

export const allAuthorities = [authorities.GUEST, authorities.MEMBER, authorities.ADMIN];

export const getOrganizationMembership = (currentUser, organization, authority) => {
    return (currentUser.organizationMemberships || [])
        .find(membership => membership.organization.id === organization.id
            && membership.authority === authority);
}

export const isOrganizationAdmin = (currentUser, organization) => {
    return !isEmpty(getOrganizationMembership(currentUser, organization, authorities.ADMIN))
}

export const isOrganizationMember = (currentUser, organization) => {
    return !isEmpty(getOrganizationMembership(currentUser, organization, authorities.MEMBER))
}

export const currentUserMembershipAuthority = (user, organizationMembership) => {
    const isMember = !isEmpty(organizationMembership);
    if (user.superUser || (isMember && organizationMembership.authority === authorities.ADMIN)) {
        return authorities.ADMIN;
    } else if (isMember && organizationMembership.authority === authorities.MEMBER) {
        return authorities.MEMBER;
    } else {
        return authorities.GUEST;
    }

}

export const hasApplicationWriteAccess = (user, application) => {
    if (user.superUser) {
        return true;
    }
    const currentOrgMembership = user.organizationMemberships
        .find(orgMembership => orgMembership.organization.id === application.organization.id);
    if (isEmpty(!currentOrgMembership)) {
        return false;
    }
    if (currentOrgMembership.authority === authorities.ADMIN) {
        return true;
    }
    const applicationMembership = (currentOrgMembership.applicationMemberships || [])
        .find(appMembership => appMembership.applicationIdentifier === application.id);
    if (application.ownerIdentifier === user.id || !isEmpty(applicationMembership)) {
        return true
    }
    return false;
}

export const hasApplicationDeleteAccess = (user, application) => {
    if (user.superUser) {
        return true;
    }
    const currentOrgMembership = user.organizationMemberships
        .find(orgMembership => orgMembership.organization.id === application.organization.id);
    if (isEmpty(!currentOrgMembership)) {
        return false;
    }
    if (currentOrgMembership.authority === authorities.ADMIN) {
        return true;
    }
    return application.ownerIdentifier === user.id;
}

export const deriveAccess = (user, spEntityId) => {
    const allowedEntities = user.identityProvider.data.allowedEntities.map(e => e.name);
    let isAccessible = allowedEntities.includes(spEntityId);
    let isReadOnly = !isAccessible;

    if (!isAccessible) {
        isAccessible = user.changeRequests.some(cr =>
            cr.requestType === CHANGE_REQUEST_TYPE.LINK_REQUEST &&
            cr.pathUpdateType === "ADDITION" &&
            cr.pathUpdates.allowedEntities.name === spEntityId
        );
    }

    return { isAccessible, isReadOnly };
}

export const isAdmin = (user, authorities) => {
    const idpId = user.identityProvider.id;
    const orgMembership = user.organizationMemberships.find(
        m => m.organization.manageIdentifier === idpId
    );
    return user.superUser || (orgMembership && orgMembership.authority === authorities.ADMIN);
}
