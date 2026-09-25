package access.api;

import access.exception.UserRestrictionException;
import access.model.*;
import access.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;


import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserAccessRightsTest {

    private final UserAccessRights userAccessRights = new UserAccessRights() {};

    @Test
    void confirmOrganizationMembership() {
        userAccessRights.confirmOrganizationMembership(new User(true, Map.of()), null, null);

        User user = new User(false,Map.of());
        Organization organization = new Organization("name", "sho");
        organization.setId(1L);
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, Authority.ADMIN);
        user.addOrganizationMembership(organizationMembership);
        organization.addOrganizationMembership(organizationMembership);

        userAccessRights.confirmOrganizationMembership(user, organization, Authority.ADMIN);

        organizationMembership.setAuthority(Authority.MEMBER);
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmOrganizationMembership(user, organization, Authority.ADMIN));
    }

    @Test
    void confirmApplicationWriteAccess() {
        userAccessRights.confirmApplicationWriteAccess(new User(true,Map.of()), null);

        User user = new User(false, Map.of());
        Application application = new Application();
        application.setId(1L);
        application.setOrganization(new Organization());
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationWriteAccess(user, application));

        Organization organization = new Organization("name", "sho");
        organization.setId(1L);
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, Authority.ADMIN);
        user.addOrganizationMembership(organizationMembership);
        organization.addOrganizationMembership(organizationMembership);
        application.setOrganization(organization);
        //Because of ADMIN Authority
        userAccessRights.confirmApplicationWriteAccess(user, application);
        //MEMBER Authority is not enough
        organizationMembership.setAuthority(Authority.MEMBER);
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationWriteAccess(user, application));
        //MEMBER Authority alone is not enough, but it is when the application owner is the user
        application.setOwner(user);
        user.setId(1L);
        userAccessRights.confirmApplicationWriteAccess(user, application);
        //GUEST Authority is not enough
        organizationMembership.setAuthority(Authority.GUEST);
        application.setOwner(null);
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationWriteAccess(user, application));
        //GUEST Authority alone is not enough, but it is when the user is a member of the application
        organizationMembership.addApplicationMembership(new ApplicationMembership(application, organizationMembership));
        userAccessRights.confirmApplicationWriteAccess(user, application);

        //Explicit test against MEMBER Authority (e.g. for invitations)
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationWriteAccess(user, application, Authority.MEMBER));
        organizationMembership.setAuthority(Authority.MEMBER);
        userAccessRights.confirmApplicationWriteAccess(user, application, Authority.MEMBER);
    }

    @Test
    void confirmApplicationDeleteAccess() {
        userAccessRights.confirmApplicationDeleteAccess(new User(true,Map.of()), null);

        User user = new User(false, Map.of());
        Application application = new Application();
        application.setOrganization(new Organization());
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationDeleteAccess(user, application));

        Organization organization = new Organization("name", "sho");
        organization.setId(1L);
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, Authority.ADMIN);
        user.addOrganizationMembership(organizationMembership);
        organization.addOrganizationMembership(organizationMembership);
        application.setOrganization(organization);
        //Because of ADMIN Authority
        userAccessRights.confirmApplicationDeleteAccess(user, application);
        //MEMBER Authority is not enough
        organizationMembership.setAuthority(Authority.MEMBER);
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationDeleteAccess(user, application));
        //MEMBER Authority is not enough, but it is when the application owner is the user
        application.setOwner(user);
        user.setId(1L);
        userAccessRights.confirmApplicationDeleteAccess(user, application);
        //GUEST Authority is not enough
        organizationMembership.setAuthority(Authority.GUEST);
        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationDeleteAccess(user, application));

    }

    @Test
    void confirmApplicationMembershipDeleteAccess() {
        userAccessRights.confirmApplicationMembershipDeleteAccess(new User(true, Map.of()), new ApplicationMembership());

        //Acting user is ADMIN of the organization - always allowed, regardless of guest's other applications
        User admin = new User(false, Map.of());
        admin.setId(1L);
        Organization organization = new Organization("name", "sho");
        organization.setId(1L);
        OrganizationMembership adminMembership = new OrganizationMembership(admin, organization, Authority.ADMIN);
        admin.addOrganizationMembership(adminMembership);
        organization.addOrganizationMembership(adminMembership);

        Application application = new Application();
        application.setId(1L);
        application.setOrganization(organization);

        User guestUser = new User(false, Map.of());
        guestUser.setId(2L);
        OrganizationMembership guestMembership = new OrganizationMembership(guestUser, organization, Authority.GUEST);
        ApplicationMembership guestApplicationMembership = new ApplicationMembership(application, guestMembership);
        guestMembership.addApplicationMembership(guestApplicationMembership);

        userAccessRights.confirmApplicationMembershipDeleteAccess(admin, guestApplicationMembership);

        //Acting user is a plain MEMBER, and is the owner of the only application the guest has access to - allowed
        User member = new User(false, Map.of());
        member.setId(3L);
        OrganizationMembership memberMembership = new OrganizationMembership(member, organization, Authority.MEMBER);
        member.addOrganizationMembership(memberMembership);
        organization.addOrganizationMembership(memberMembership);
        memberMembership.addApplicationMembership(new ApplicationMembership(application, memberMembership));
        application.setOwner(member);

        userAccessRights.confirmApplicationMembershipDeleteAccess(member, guestApplicationMembership);

        //Guest also has access to a second application, owned by someone else - MEMBER is no longer allowed
        Application secondApplication = new Application();
        secondApplication.setId(2L);
        secondApplication.setOrganization(organization);
        secondApplication.setOwner(admin);
        ApplicationMembership secondGuestApplicationMembership = new ApplicationMembership(secondApplication, guestMembership);
        guestMembership.addApplicationMembership(secondGuestApplicationMembership);

        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmApplicationMembershipDeleteAccess(member, guestApplicationMembership));

        //Non-guest targets are unaffected by the "owner of all applications" restriction
        OrganizationMembership secondMemberMembership = new OrganizationMembership(new User(false, Map.of()), organization, Authority.MEMBER);
        ApplicationMembership memberApplicationMembership = new ApplicationMembership(application, secondMemberMembership);
        userAccessRights.confirmApplicationMembershipDeleteAccess(member, memberApplicationMembership);
    }

    @Test
    void getOrganizationMembership() {
        User user = new User(false,Map.of());
        Organization organization = new Organization("name", "sho");
        organization.setId(1L);
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, Authority.ADMIN);
        user.addOrganizationMembership(organizationMembership);
        organization.addOrganizationMembership(organizationMembership);
        Optional<OrganizationMembership> membershipOptional = userAccessRights.getOrganizationMembership(user, organization, Authority.ADMIN);
        assertEquals(organizationMembership, membershipOptional.get());
    }

    @Test
    void reinitializeUser() {
        UserRepository userRepository = mock(UserRepository.class);
        User user = new User(false, Map.of());
        user.setId(1L);
        when(userRepository.findById(1l)).thenReturn(Optional.of(user));
        User reinitializeUser = userAccessRights.reinitializeUser(user, userRepository);
        assertEquals(user, reinitializeUser);
    }

    @Test
    void confirmSuperUser() {
        userAccessRights.confirmSuperUser(new User(true, Map.of()));

        assertThrows(UserRestrictionException.class,
                () -> userAccessRights.confirmSuperUser(new User(false, Map.of())));
    }
}