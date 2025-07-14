import {isEmpty} from "./Utils.js";

export const authorities = {
    ADMIN: "ADMIN",
    MEMBER: "MEMBER",
    GUEST: "GUEST"
}

export const allAuthorities = [authorities.GUEST, authorities.MEMBER, authorities.ADMIN];

export const isOrganizationAdmin = (currentUser, organization) => {
    const membership = (currentUser.organizationMemberships || [])
        .find(membership => membership.organization.id === organization.id
            && membership.authority === authorities.ADMIN);
    return !isEmpty(membership)

}
