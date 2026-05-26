package access.seed;

import access.manage.Contact;
import access.manage.Manage;
import access.model.*;
import access.repository.*;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class Demo {

    private static final Log LOG = LogFactory.getLog(Demo.class);

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ApplicationRepository applicationRepository;
    private final ConnectionRepository connectionRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final ApplicationMembershipRepository applicationMembershipRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final Manage manage;

    public Demo(UserRepository userRepository,
                OrganizationRepository organizationRepository,
                ApplicationRepository applicationRepository,
                ConnectionRepository connectionRepository,
                OrganizationMembershipRepository organizationMembershipRepository,
                ApplicationMembershipRepository applicationMembershipRepository,
                JoinRequestRepository joinRequestRepository,
                Manage manage) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.applicationRepository = applicationRepository;
        this.connectionRepository = connectionRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.applicationMembershipRepository = applicationMembershipRepository;
        this.joinRequestRepository = joinRequestRepository;
        this.manage = manage;
    }

    public Map<String, Object> seed() {
        LOG.info("Starting demo seed: deleting all existing data");

        // Delete in FK-safe order (same as AbstractTest.doSeed)
        userRepository.deleteAllInBatch();
        applicationRepository.deleteAllInBatch();
        organizationRepository.deleteAllInBatch();
        joinRequestRepository.deleteAllInBatch();

        // -------------------------------------------------------------------------
        // Organization 1: Dummy IdP (has manageIdentifier)
        // -------------------------------------------------------------------------
        Organization dummyIdp = new Organization("Dummy IdP", "dummy-idp.example.com",
                "ad93daef-0911-e511-80d0-005056956c1a", 1);
        dummyIdp.setStatus(OrganizationStatus.APPROVED);
        organizationRepository.save(dummyIdp);

        // Users for Dummy IdP
        User adminExample = new User(false, "admin@example.com", "admin@example.com",
                "example.com", "Admin", "Mock", "admin@example.com", "http://mock-idp");
        User memberExample = new User(false, "member@example.com", "member@example.com",
                "example.com", "Member", "Mock", "member@example.com", "http://mock-idp");
        User guestExample = new User(false, "guest@example.com", "guest@example.com",
                "example.com", "Guest", "Mock", "guest@example.com", "http://mock-idp");
        userRepository.saveAll(List.of(adminExample, memberExample, guestExample));

        // Memberships for Dummy IdP
        OrganizationMembership adminExampleMembership =
                new OrganizationMembership(adminExample, dummyIdp, Authority.ADMIN);
        OrganizationMembership memberExampleMembership =
                new OrganizationMembership(memberExample, dummyIdp, Authority.MEMBER);
        OrganizationMembership guestExampleMembership =
                new OrganizationMembership(guestExample, dummyIdp, Authority.GUEST);
        organizationMembershipRepository.saveAll(
                List.of(adminExampleMembership, memberExampleMembership, guestExampleMembership));

        // Application: Prod App (with connections)
        Application prodApp = new Application("Prod App", dummyIdp, "Demo", Map.of());
        applicationRepository.save(prodApp);

        // OIDC connection — PROD_READY
        Connection prodAppOidc = new Connection("Prod App OIDC", prodApp, Map.of(
                "entityID", "https://prod-app.example.com",
                "redirectUrls", List.of("https://prod-app.example.com/redirect"),
                "grantTypes", List.of("authorization_code"),
                "contactPersons", List.of(new Contact("technical", "Admin", "Mock", "admin@example.com"))
        ), EntityType.oidc10_rp);
        prodAppOidc.setStatus(ConnectionStatus.PROD_READY);
        prodAppOidc.setState(State.prodaccepted);
        connectionRepository.save(prodAppOidc);
        manage.saveProvider(prodAppOidc);

        // SAML connection — PENDING_PROD
        Connection prodAppSaml = new Connection("Prod App SAML", prodApp, Map.of(
                "entityID", "https://prod-app-saml.example.com",
                "acsLocations", List.of("https://prod-app-saml.example.com/acs"),
                "contactPersons", List.of(new Contact("technical", "Admin", "Mock", "admin@example.com")),
                "arp", Map.of("attributes", Map.of(), "enabled", true)
        ), EntityType.saml20_sp);
        prodAppSaml.setStatus(ConnectionStatus.PENDING_PROD);
        connectionRepository.save(prodAppSaml);
        manage.saveProvider(prodAppSaml);

        // ApplicationMembership: guest on Prod App
        ApplicationMembership guestAppMembership =
                new ApplicationMembership(prodApp, guestExampleMembership);
        applicationMembershipRepository.save(guestAppMembership);

        // Application: Mock App (no connections)
        Application mockApp = new Application("Mock App", dummyIdp, "Demo", Map.of());
        applicationRepository.save(mockApp);

        // -------------------------------------------------------------------------
        // Organization 2: Commerz (no manageIdentifier)
        // -------------------------------------------------------------------------
        Organization commerz = new Organization("Commerz", "commerz.example.com");
        commerz.setStatus(OrganizationStatus.APPROVED);
        organizationRepository.save(commerz);

        // Users for Commerz
        User adminTest = new User(false, "admin@test.nl", "admin@test.nl",
                "test.nl", "Admin", "Test", "admin@test.nl", "http://mock-idp");
        User memberTest = new User(false, "member@test.nl", "member@test.nl",
                "test.nl", "Member", "Test", "member@test.nl", "http://mock-idp");
        User guestTest = new User(false, "guest@test.nl", "guest@test.nl",
                "test.nl", "Guest", "Test", "guest@test.nl", "http://mock-idp");
        userRepository.saveAll(List.of(adminTest, memberTest, guestTest));

        // Memberships for Commerz
        OrganizationMembership adminTestMembership =
                new OrganizationMembership(adminTest, commerz, Authority.ADMIN);
        OrganizationMembership memberTestMembership =
                new OrganizationMembership(memberTest, commerz, Authority.MEMBER);
        OrganizationMembership guestTestMembership =
                new OrganizationMembership(guestTest, commerz, Authority.GUEST);
        organizationMembershipRepository.saveAll(
                List.of(adminTestMembership, memberTestMembership, guestTestMembership));

        // Application: ShareLogic (no connections)
        Application shareLogic = new Application("ShareLogic", commerz, "Demo", Map.of());
        applicationRepository.save(shareLogic);

        // Solo user — no organization membership
        User soloDoe = new User(false, "sole@test.nl", "sole@test.nl",
                "test.nl", "Solo", "Doe", "sole@test.nl", "http://mock-idp");
        userRepository.save(soloDoe);

        // Join request from Solo Doe to Commerz
        JoinRequest joinRequest = new JoinRequest(soloDoe, commerz, "Please let me join", Language.en);
        joinRequestRepository.save(joinRequest);

        LOG.info("Demo seed completed successfully");
        return Map.of("status", "ok");
    }
}
