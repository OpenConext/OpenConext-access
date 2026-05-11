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
    if (isEmpty(currentOrgMembership)) {
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
    if (isEmpty(currentOrgMembership)) {
        return false;
    }
    if (currentOrgMembership.authority === authorities.ADMIN) {
        return true;
    }
    return application.ownerIdentifier === user.id && currentOrgMembership.authority !== authorities.GUEST;
}

export const deriveAccess = (currentOrganization, spEntityId) => {
    let isAccessible = false, isReadOnly = false, isPendingDisconnect = false;
    if (isEmpty(currentOrganization.identityProvider)) {
        //External user
        return {isAccessible, isReadOnly, isPendingDisconnect};
    }
    const allowedEntities = currentOrganization.identityProvider.data.allowedEntities.map(e => e.name);
    isAccessible = allowedEntities.includes(spEntityId);
    isReadOnly = !isAccessible;
    let ticketKey = null;
    if (!isAccessible) {
        const changeRequestAdd = currentOrganization.changeRequests.find(cr =>
            cr.requestType === CHANGE_REQUEST_TYPE.LINK_REQUEST &&
            cr.pathUpdateType === "ADDITION" &&
            cr.pathUpdates.allowedEntities.name === spEntityId
        );
        isAccessible = !isEmpty(changeRequestAdd);
        ticketKey = isEmpty(changeRequestAdd) ? null : changeRequestAdd.ticketKey
    }
    const changeRequestRemoval = currentOrganization.changeRequests.find(cr =>
        cr.requestType === CHANGE_REQUEST_TYPE.UNLINK_REQUEST &&
        cr.pathUpdateType === "REMOVAL" &&
        cr.pathUpdates.allowedEntities.name === spEntityId
    );
    isPendingDisconnect = !isEmpty(changeRequestRemoval);
    if (ticketKey === null) {
        ticketKey = isEmpty(changeRequestRemoval) ? null : changeRequestRemoval.ticketKey;
    }
    return {isAccessible, isReadOnly, isPendingDisconnect, ticketKey};
}

export const isAdmin = (user, currentOrganization, authorities) => {
    if (isEmpty(currentOrganization.identityProvider)) {
        //External user
        return false;
    }
    const orgMembership = user.organizationMemberships.find(
        m => m.organization.id === currentOrganization.id
    );
    return user.superUser || (orgMembership && orgMembership.authority === authorities.ADMIN);
}

export const hasCreateApplicationAccess = (user, organization) => {
    const organizationMembership = (user.organizationMemberships || [])
        .find(membership => membership.organization.id === organization.id);
    return !isEmpty(organizationMembership) && organizationMembership.authority !== authorities.GUEST;
}
