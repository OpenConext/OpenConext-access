import {isEmpty} from "./Utils.js";

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

export const isAllowed = (user, requiredAuthority) => {
    if (user.superUser) {
        return true;
    }
    if (isEmpty(user.organizationMemberships)) {
        return false;
    }
    const mostImportantAuthority = user.organizationMemberships.reduce((max, membership) => {
        return authorityWeights[membership.authority] > authorityWeights[max.authority]
            ? membership : max;
    }, {authority: authorities.GUEST})
    return mostImportantAuthority.authority >= authorityWeights[requiredAuthority]
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
