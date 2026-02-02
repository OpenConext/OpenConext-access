package access.api;

import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.model.Application;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.UserRepository;

import java.util.Optional;

public interface UserAccessRights {

    default void confirmOrganizationMembership(User user, Organization organization, Authority authority) {
        if (user.isSuperUser()) {
            return;
        }
        //Throw an Exception if there is no Organization membership for this user with the required authority
        getOrganizationMembership(user, organization, authority)
                .orElseThrow(() -> new UserRestrictionException(
                        String.format("User %s is not a member of organization %s",
                                user.getEmail(), organization.getName())));
    }

    default void confirmApplicationWriteAccess(User user, Application application) {
        confirmApplicationWriteAccess(user, application, Authority.GUEST);
    }

    default void confirmApplicationWriteAccess(User user, Application application, Authority minimalAuthority) {
        if (user.isSuperUser()) {
            return;
        }
        //First, get the organization membership for the user
        Organization organization = application.getOrganization();
        OrganizationMembership organizationMembership = getOrganizationMembership(user, organization, minimalAuthority)
                .orElseThrow(() -> new UserRestrictionException(
                        String.format("User %s is not a %s of organization %s",
                                user.getEmail(), minimalAuthority, organization.getName())));

        boolean allowed = switch (organizationMembership.getAuthority()) {
            case ADMIN -> true;
            case MEMBER, GUEST -> {
                boolean allowedByApplicationMembership = organizationMembership.getApplicationMemberships()
                        .stream()
                        .anyMatch(applicationMembership -> applicationMembership.getApplication().getId().equals(application.getId()));
                yield allowedByApplicationMembership ||
                        (application.getOwner() != null && application.getOwner().getId().equals(user.getId()));
            }
        };
        if (!allowed) {
            throw new UserRestrictionException(
                    String.format("User %s is not allowed to access application %s",
                            user.getEmail(), application.getName()));
        }


    }


    default void confirmApplicationDeleteAccess(User user, Application application) {
        if (user.isSuperUser()) {
            return;
        }
        //First, get the organization membership for the user
        Organization organization = application.getOrganization();
        OrganizationMembership organizationMembership = getOrganizationMembership(user, organization, Authority.MEMBER)
                .orElseThrow(() -> new UserRestrictionException(
                        String.format("User %s is not a member of organization %s",
                                user.getEmail(), organization.getName())));

        boolean allowed = switch (organizationMembership.getAuthority()) {
            case ADMIN -> true;
            case MEMBER -> application.getOwner() != null && application.getOwner().getId().equals(user.getId());
            case GUEST -> false;
        };
        if (!allowed) {
            throw new UserRestrictionException(
                    String.format("User %s is not allowed to access application %s",
                            user.getEmail(), application.getName()));
        }
    }

    default Optional<OrganizationMembership> getOrganizationMembership(User user, Organization organization, Authority authority) {
        return user.getOrganizationMemberships().stream()
                .filter(orgMembership -> orgMembership.getOrganization().getId().equals(organization.getId()))
                .filter(orgMembership -> orgMembership.getAuthority().isAllowed(authority))
                .findFirst();
    }

    default User reinitializeUser(User user, UserRepository userRepository) {
        //To prevent LazyInitializationException
        return userRepository.findById(user.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    default void confirmSuperUser(User user) {
        if (!user.isSuperUser()) {
            throw new UserRestrictionException(String.format("User %s is no super user",
                    user.getEmail()));
        }
    }

    default void confirmInstitutionAdmin(User user) {
        if (!user.isSuperUser() && !user.isInstitutionAdmin()) {
            throw new UserRestrictionException(String.format("User %s, %s is no super user or institution admin",
                    user.getEmail(), user.getAuthenticatingAuthority()));
        }

    }

}
