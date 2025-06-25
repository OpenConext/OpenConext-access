package access.api;

import access.AbstractMailTest;
import access.AccessCookieFilter;
import access.model.*;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

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
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        Map<String, Object> invitationData = Map.of(
                "language", Language.en,
                "email", "jdoe@test.com",
                "message", "Please join",
                "authority", Authority.MEMBER,
                "organization", Map.of("id", organization.getId()),
                "applications", List.of(Map.of("id", application.getId()))
        );
        Map<String, Object> invitation = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(invitationData)
                .post("/api/v1/invitations")
                .as(new TypeRef<>() {
                });
        assertEquals(ConnectionStatus.OPEN.name(), invitation.get("status"));

        Map<String, Object> inviter = (Map<String, Object>) invitation.get("inviter");
        assertEquals("Mary Doe", inviter.get("name"));
        String hash = invitation.get("hash").toString();
        assertNotNull(hash);

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains(SHARE_LOGICS));
        assertTrue(htmlContent.contains(hash));
    }

    @Test
    void accept() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow("urn:collab:person:eduid.nl:new_user");
        Invitation invitation = invitationRepository.findByHash(SHARE_LOGICS_INVITATION_HASH).get();
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
}