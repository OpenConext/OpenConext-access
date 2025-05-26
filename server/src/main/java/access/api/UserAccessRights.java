package access.api;

import access.exception.UserRestrictionException;
import access.model.Authority;
import access.model.Organization;
import access.model.User;

public interface UserAccessRights {

    default void confirmOrganizationMembership(User user, Organization organization, Authority authority) {
        if (user.getOrganizationMemberships().stream()
                .noneMatch(organizationMembership ->
                        organizationMembership.getOrganization().getId().equals(organization.getId()) &&
                                organizationMembership.getAuthority().isAllowed(authority))) {
            throw new UserRestrictionException(String.format("User %s is not allowed to access organization %s as authority %s",
                    user.getEmail(), organization.getName(), authority.name()));
        }
    }

}
