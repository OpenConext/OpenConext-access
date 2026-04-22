package access.cron;

import access.AbstractMailTest;
import access.mail.MimeMessageParser;
import access.model.*;
import com.github.tomakehurst.wiremock.client.WireMock;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.*;

class ResourceCleanerTest extends AbstractMailTest {

    @Autowired
    private ResourceCleaner resourceCleaner;

    @Test
    @SneakyThrows
    void doClean_sendsOrgContactReminder() {
        // shareLogics (manageIdentifier "7") and logistics (manageIdentifier "8") both have no
        // lastContactReminderAt → one reminder per org (one administrative contact each)
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Organization logistics = organizationRepository.findById(seedIdentifiers.get(LOGISTICS)).get();

        for (Organization org : List.of(shareLogics, logistics)) {
            Map<String, Object> provider = buildProviderWithAdminContact(org.getManageIdentifier());
            String body = objectMapper.writeValueAsString(provider);
            mockServer.stubFor(WireMock.get(String.format("/manage/api/internal/metadata/saml20_idp/%s",
                    org.getManageIdentifier()))
                    .atPriority(1)
                    .willReturn(aResponse()
                            .withHeader("Content-Type", "application/json")
                            .withBody(body)
                            .withStatus(200)));
        }

        Map<String, Object> results = resourceCleaner.doClean();

        assertEquals(2, ((List<?>) results.get("orgReminders")).size()); // shareLogics + logistics each have one admin contact

        MimeMessageParser parser = mailMessage(); // waits for at least one mail
        assertNotNull(parser.getHtmlContent());
    }

    @Test
    @SneakyThrows
    void doClean_skipOrgContactReminderWhenRecentlySent() {
        // Set lastContactReminderAt to now → no reminder should be sent
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        shareLogics.setLastContactReminderAt(Instant.now());
        organizationRepository.save(shareLogics);

        Organization logistics = organizationRepository.findById(seedIdentifiers.get(LOGISTICS)).get();
        logistics.setLastContactReminderAt(Instant.now());
        organizationRepository.save(logistics);

        Map<String, Object> results = resourceCleaner.doClean();

        assertTrue(((List<?>) results.get("orgReminders")).isEmpty());
        confirmNoMailMessages();
    }

    @Test
    void doClean_deletesOrgWithNoConnectionsWhenOldEnough() {
        // Create an org without a manageIdentifier, with no connections, and an old createdAt
        Organization staleOrg = new Organization("StaleOrg", "stale.org");
        staleOrg.setCreatedAt(Instant.now().minus(400, ChronoUnit.DAYS));
        organizationRepository.save(staleOrg);

        Map<String, Object> results = resourceCleaner.doClean();

        assertEquals(List.of("StaleOrg"), results.get("orgsDeleted"));
        assertFalse(organizationRepository.findById(staleOrg.getId()).isPresent());
    }

    @Test
    void doClean_doesNotDeleteOrgTooNew() {
        // Org without manageIdentifier but created only 10 days ago → should NOT be deleted
        Organization newOrg = new Organization("NewOrg", "new.org");
        newOrg.setCreatedAt(Instant.now().minus(10, ChronoUnit.DAYS));
        organizationRepository.save(newOrg);

        long countBefore = organizationRepository.count();

        Map<String, Object> results = resourceCleaner.doClean();

        assertTrue(((List<?>) results.get("orgsDeleted")).isEmpty());
        assertEquals(countBefore, organizationRepository.count());
    }

    @Test
    void doClean_doesNotDeleteOrgWithConnections() {
        // farWind has no manageIdentifier and has an Application (NitroMap) but no connections
        // → should be deleted if old enough; make it old to verify connection-check matters
        // First ensure farWind has a connection via NitroMap
        Application nitroMap = applicationRepository.findById(seedIdentifiers.get(NITRO_MAP)).get();
        Connection connection = new Connection(
                "NitroMap-Test",
                nitroMap,
                Map.of("entityID", "https://nitromo.test"),
                EntityType.saml20_sp,
                Environment.TEST);
        connectionRepository.save(connection);

        // Make farWind old enough to be eligible for deletion
        Organization farWind = organizationRepository.findById(seedIdentifiers.get(FAR_WIND)).get();
        farWind.setCreatedAt(Instant.now().minus(400, ChronoUnit.DAYS));
        organizationRepository.save(farWind);

        Map<String, Object> results = resourceCleaner.doClean();

        assertTrue(((List<?>) results.get("orgsDeleted")).isEmpty());
        assertTrue(organizationRepository.findById(farWind.getId()).isPresent());
    }

    @Test
    @SneakyThrows
    void doClean_warnsInactiveUser() {
        // Create a user with a membership whose lastActivity is 70 days ago
        // (beyond warn threshold of 60, but before delete threshold of 90)
        User inactiveUser = new User(false, "urn:inactive:warn", "urn:inactive:warn",
                "example.com", "Warn", "User", "warn.user@example.com", "http://mock-idp");
        inactiveUser.setLastActivity(Instant.now().minus(70, ChronoUnit.DAYS));
        userRepository.save(inactiveUser);

        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        OrganizationMembership membership = new OrganizationMembership(inactiveUser, shareLogics, Authority.MEMBER);
        organizationMembershipRepository.save(membership);

        Map<String, Object> results = resourceCleaner.doClean();

        assertEquals(List.of("warn.user@example.com"), results.get("usersWarned"));
        assertTrue(((List<?>) results.get("usersDeleted")).isEmpty());

        MimeMessageParser parser = mailMessage();
        assertNotNull(parser.getHtmlContent());
    }

    @Test
    void doClean_deletesInactiveUser() {
        // Create a user with a membership whose lastActivity is 100 days ago (beyond delete threshold of 90)
        User inactiveUser = new User(false, "urn:inactive:delete", "urn:inactive:delete",
                "example.com", "Delete", "User", "delete.user@example.com", "http://mock-idp");
        inactiveUser.setLastActivity(Instant.now().minus(100, ChronoUnit.DAYS));
        userRepository.save(inactiveUser);

        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        OrganizationMembership membership = new OrganizationMembership(inactiveUser, shareLogics, Authority.MEMBER);
        organizationMembershipRepository.save(membership);

        Map<String, Object> results = resourceCleaner.doClean();

        assertTrue(((List<?>) results.get("usersWarned")).isEmpty());
        assertEquals(List.of("delete.user@example.com"), results.get("usersDeleted"));
        assertFalse(userRepository.findById(inactiveUser.getId()).isPresent());
    }

    @Test
    void doClean_doesNotAffectActiveUser() {
        // Create a user with a membership who was active recently
        User activeUser = new User(false, "urn:active:user", "urn:active:user",
                "example.com", "Active", "User", "active.user@example.com", "http://mock-idp");
        activeUser.setLastActivity(Instant.now().minus(5, ChronoUnit.DAYS));
        userRepository.save(activeUser);

        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        OrganizationMembership membership = new OrganizationMembership(activeUser, shareLogics, Authority.MEMBER);
        organizationMembershipRepository.save(membership);

        Map<String, Object> results = resourceCleaner.doClean();

        assertTrue(((List<?>) results.get("usersWarned")).isEmpty());
        assertTrue(((List<?>) results.get("usersDeleted")).isEmpty());
        assertTrue(userRepository.findById(activeUser.getId()).isPresent());
    }

    @Test
    @SneakyThrows
    void doClean_warnsInactiveUserOnlyOnce() {
        // Running the cron twice should only produce one warning email per user
        User inactiveUser = new User(false, "urn:inactive:once", "urn:inactive:once",
                "example.com", "Once", "User", "once.user@example.com", "http://mock-idp");
        inactiveUser.setLastActivity(Instant.now().minus(70, ChronoUnit.DAYS));
        userRepository.save(inactiveUser);

        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        OrganizationMembership membership = new OrganizationMembership(inactiveUser, shareLogics, Authority.MEMBER);
        organizationMembershipRepository.save(membership);

        // First run — should warn
        Map<String, Object> first = resourceCleaner.doClean();
        assertEquals(List.of("once.user@example.com"), first.get("usersWarned"));
        // Wait for the background mail thread to complete before proceeding
        mailMessage();

        // Second run — inactivityWarningSentAt is now set, so user must be skipped
        Map<String, Object> second = resourceCleaner.doClean();
        assertTrue(((List<?>) second.get("usersWarned")).isEmpty());
    }

    /**
     * Build a fake Manage provider response that contains one administrative contact,
     * matching the structure parsed by {@link Organization#mergeMetaData}.
     */
    @SneakyThrows
    private Map<String, Object> buildProviderWithAdminContact(String manageId) {
        Map<String, Object> metaDataFields = new HashMap<>();
        // Use manageId in the name to avoid unique-name collisions across orgs
        metaDataFields.put("name:en", "Mock IdP " + manageId);
        metaDataFields.put("logo:0:url", "https://static.surfconext.nl/media/idp/surfconext.png");
        metaDataFields.put("contacts:0:contactType", "administrative");
        metaDataFields.put("contacts:0:givenName", "Admin");
        metaDataFields.put("contacts:0:surName", "Contact");
        metaDataFields.put("contacts:0:emailAddress", "admin.contact." + manageId + "@example.com");

        Map<String, Object> data = new HashMap<>();
        data.put("entityid", "http://mock-idp-" + manageId);
        data.put("state", "prodaccepted");
        data.put("metaDataFields", metaDataFields);

        Map<String, Object> provider = new HashMap<>();
        provider.put("_id", manageId);
        provider.put("version", 1);
        provider.put("type", "saml20_idp");
        provider.put("data", data);
        return provider;
    }
}
