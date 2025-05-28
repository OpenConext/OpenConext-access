package access.api;

import access.exception.UserRestrictionException;
import access.model.Application;
import access.model.Authority;
import access.model.Organization;
import access.model.User;

import java.util.Collection;

public interface UserAccessRights {

    default void confirmOrganizationMembership(User user, Organization organization, Authority authority) {
        if (!user.isSuperUser() && user.getOrganizationMemberships().stream()
                .noneMatch(organizationMembership ->
                        organizationMembership.getOrganization().getId().equals(organization.getId()) &&
                                organizationMembership.getAuthority().isAllowed(authority))) {
            throw new UserRestrictionException(String.format("User %s is not allowed to access organization %s as authority %s",
                    user.getEmail(), organization.getName(), authority.name()));
        }
    }

    default void confirmApplicationMembership(User user, Organization organization, Application application, Authority authority) {
        if (!user.isSuperUser() && user.getOrganizationMemberships().stream()
                .map(organizationMembership -> organizationMembership.getApplicationMemberships())
                .flatMap(Collection::stream)
                .noneMatch(applicationMembership -> applicationMembership.getApplication().getId().equals(application.getId()) &&
                        applicationMembership.getAuthority().isAllowed(authority))) {
            //Now we fall back to the organization membership
            confirmOrganizationMembership(user, organization, authority);
        }
    }


}
