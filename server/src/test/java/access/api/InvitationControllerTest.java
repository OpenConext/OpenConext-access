package access.api;

import access.AbstractMailTest;
import access.AccessCookieFilter;
import access.model.*;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Type;
import java.util.*;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("unchecked")
class InvitationControllerTest extends AbstractMailTest {

    @Test
    void findByOrganization() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        List<Map<String, Object>> invitations = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organization.getId())
                .get("/api/v1/invitations/all/{organizationId}")
                .as(new TypeRef<>() {
                });
        assertEquals(1, invitations.size());
        Map<String, Object> inviter = (Map<String, Object>) invitations.getFirst().get("inviter");
        assertEquals("Mary Doe", inviter.get("name"));
    }

    @Test
    void findByOrganization404() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", 999L)
                .get("/api/v1/invitations/all/{organizationId}")
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        String inviteeMail = "jdoe@test.com";
        InvitationForm invitationForm = new InvitationForm(
                Language.en,
                List.of(inviteeMail),
                "Please join",
                Authority.MEMBER,
                organization.getId(),
                Set.of(application.getId()));
        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(invitationForm)
                .post("/api/v1/invitations")
                .as(new TypeRef<>() {
                });
        assertEquals(201, results.get("status"));


        Invitation invitation = invitationRepository.findByOrganization(organization).stream()
                .filter(inv -> inv.getEmail().equals(inviteeMail))
                .findFirst()
                .get();
        assertEquals("Mary Doe", invitation.getInvitee().getName());
        String hash = invitation.getHash();
        assertNotNull(hash);

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains(SHARE_LOGICS));
        assertTrue(htmlContent.contains(hash));
    }

    @Test
    void accept() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow("urn:collab:person:eduid.nl:new_user");
        Invitation invitation = invitationRepository.findDetailsByHash(SHARE_LOGICS_INVITATION_HASH).get();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(new AcceptInvitation(invitation.getHash(), invitation.getId()))
                .put("/api/v1/invitations/accept")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        super.stubForIdentityProviderByEntityId("http://mock-idp");
        super.stubForGetChangeRequests(getChangeRequests());
        super.stubForGetProvider(EntityType.saml20_idp, "7");

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(User.class);
        assertEquals(1, user.getOrganizationMemberships().size());

        Invitation invitationFromDB = invitationRepository.findById(invitation.getId()).get();
        assertEquals(InvitationStatus.ACCEPTED, invitationFromDB.getStatus());
        assertNull(invitationFromDB.getHash());
        assertNotNull(invitationFromDB.getAcceptedAt());
    }

    @SneakyThrows
    @Test
    void acceptWithInternalUser() {
        this.stubForStats();
        String sub = "urn:collab:person:idp-uu:internal_user";
        //There will be an organization created JIT for this login
        String authenticatingAuthority = "https://idp-uu";
        String schacHomeOrganization = "idp.uu";
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", sub,
                m -> {
                    m.put("schac_home_organization", schacHomeOrganization);
                    m.put("surf-crm-id", ORGANISATION_GUID);
                    return m;
                });
        //Lookup for identity provider by authenticating authority
        super.stubForIdentityProviderByInstitutionalGUID(ORGANISATION_GUID);
        super.stubForGetChangeRequests(getChangeRequests());
        super.stubForGetProvider(EntityType.saml20_idp, "7");

        Map<String, Object> res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get(accessCookieFilter.apiURL())
                .as(new TypeRef<>() {
                });
        //User has been provisioned to organization authenticatingAuthority
        User user = objectMapper.convertValue(res, User.class);
        assertEquals(1, user.getOrganizationMemberships().size());
        Organization organization = user.getOrganizationMemberships().iterator().next().getOrganization();

        //Now create an Application for the new invitation
        Application application = new Application("JIT", organization, "me", Map.of());
        application = applicationRepository.save(application);

        //Now create an invitation with this organization, and application memberships
        String hash = UUID.randomUUID().toString();
        Invitation invitation = new Invitation(
                Language.en,
                hash,
                "some@new.ocm",
                "Please",
                Authority.GUEST,
                organization,
                userRepository.findBySubIgnoreCase(SUPER_SUB).get(),
                Set.of(application)
        );
        invitation = invitationRepository.save(invitation);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(new AcceptInvitation(invitation.getHash(), invitation.getId()))
                .put("/api/v1/invitations/accept")
                .then()
                .statusCode(HttpStatus.CREATED.value());
        //Now call me endpoint to see if the application membership is added to this user's organization membership
        Map<String, Object> userFromMe = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(new TypeRef<>() {
                });
        List<Map<String, Object>> organizationMemberships = (List<Map<String, Object>>) userFromMe.get("organizationMemberships");
        assertEquals(1, organizationMemberships.size());
        Map<String, Object> organizationMembership = organizationMemberships.getFirst();
        List<Map<String, Object>> applicationMemberships = (List<Map<String, Object>>) organizationMembership.get("applicationMemberships");
        assertEquals(1, applicationMemberships.size());
        Map<String, Object> applicationMap = applicationMemberships.getFirst();
        assertEquals(application.getId().intValue(), applicationMap.get("applicationIdentifier"));
    }

    @Test
    void findByHash() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow("urn:collab:person:eduid.nl:new_user");
        Map<String, Object> invitation = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("hash", SHARE_LOGICS_INVITATION_HASH)
                .get("/api/v1/invitations/hash")
                .as(new TypeRef<>() {
                });
        assertEquals("jdoe@invitation.org", invitation.get("email"));
        Map<String, Object> inviter = (Map<String, Object>) invitation.get("inviter");
        assertNotNull(inviter.get("email"));

        Map<String, Object> organization = (Map<String, Object>) invitation.get("organization");
        assertNotNull(organization.get("name"));
    }

    @Test
    void deleteInvitation() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Invitation invitation = invitationRepository.findDetailsByHash(SHARE_LOGICS_INVITATION_HASH).get();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("invitationId", invitation.getId())
                .delete("/api/v1/invitations/{invitationId}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());

        Optional<Invitation> optionalInvitation = invitationRepository.findDetailsByHash(SHARE_LOGICS_INVITATION_HASH);
        assertTrue(optionalInvitation.isEmpty());
    }

    @Test
    void deleteAllInvitation() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organization.getId())
                .delete("/api/v1/invitations/delete/all/{organizationId}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());

        List<Invitation> invitations = invitationRepository.findByOrganization(organization);
        assertTrue(invitations.isEmpty());
    }

    @Test
    void resendInvitation() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Invitation invitation = invitationRepository.findDetailsByHash(SHARE_LOGICS_INVITATION_HASH).get();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("invitationId", invitation.getId())
                .put("/api/v1/invitations/resend/{invitationId}")
                .then()
                .statusCode(HttpStatus.OK.value());

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains(SHARE_LOGICS));
    }
}
