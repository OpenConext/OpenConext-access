package access.api;

import access.AbstractMailTest;
import access.AccessCookieFilter;
import access.model.*;
import access.request.JoinRequestApproval;
import access.request.JoinRequestForm;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class JoinRequestControllerTest extends AbstractMailTest {

    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        List<Map<String, Object>> joinRequests = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organization.getId())
                .get("/api/v1/join/all/{organizationId}")
                .as(new TypeRef<>() {
                });
        assertEquals(2, joinRequests.size());
    }

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow("urn:collab:person:example.com:new_user");
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        JoinRequestForm joinRequestForm = new JoinRequestForm(organization.getId(), "Please", Language.en);

        JoinRequest joinRequest = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(joinRequestForm)
                .post("/api/v1/join")
                .as(new TypeRef<>() {
                });
        assertEquals(SHARE_LOGICS, joinRequest.getOrganization().getName());

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains(SHARE_LOGICS));

        //Not allowed to create a join request for the same organization and user twice
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(joinRequestForm)
                .post("/api/v1/join")
                .then()
                .statusCode(HttpStatus.CONFLICT.value());
    }

    @Test
    void approval() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long joinRequestId = seedIdentifiers.get(String.format("%s%s%s", JoinRequest.class.getName(), SHARE_LOGICS, "Peter Doe"));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(new JoinRequestApproval(joinRequestId, true, Authority.GUEST))
                .put("/api/v1/join/approval")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains(SHARE_LOGICS));

        Optional<JoinRequest> optionalJoinRequest = joinRequestRepository.findById(joinRequestId);
        assertFalse(optionalJoinRequest.isPresent());

        //This is the user that joinRequest is accepted
        User user = userRepository.findDetailsById(seedIdentifiers.get("Peter Doe")).get();
        Optional<OrganizationMembership> optionalOrganizationMembership = user.getOrganizationMemberships().stream()
                .filter(membership -> membership.getOrganization().getName().equalsIgnoreCase(SHARE_LOGICS) &&
                        membership.getAuthority().equals(Authority.GUEST))
                .findFirst();
        assertTrue(optionalOrganizationMembership.isPresent());
    }

    @Test
    void denial() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long joinRequestId = seedIdentifiers.get(String.format("%s%s%s", JoinRequest.class.getName(), SHARE_LOGICS, "Peter Doe"));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(new JoinRequestApproval(joinRequestId, false, null))
                .put("/api/v1/join/approval")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains("denied"));

        Optional<JoinRequest> optionalJoinRequest = joinRequestRepository.findById(joinRequestId);
        assertFalse(optionalJoinRequest.isPresent());

        //This is the user that joinRequest is denied
        User user = userRepository.findDetailsById(seedIdentifiers.get("Peter Doe")).get();
        Optional<OrganizationMembership> optionalOrganizationMembership = user.getOrganizationMemberships().stream()
                .filter(membership -> membership.getOrganization().getName().equalsIgnoreCase(SHARE_LOGICS))
                .findFirst();
        assertFalse(optionalOrganizationMembership.isPresent());
    }
}