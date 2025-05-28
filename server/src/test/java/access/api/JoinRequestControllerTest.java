package access.api;

import access.AbstractMailTest;
import access.AccessCookieFilter;
import access.model.Language;
import access.model.Organization;
import access.request.JoinRequestForm;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.Ignore;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
        assertEquals(1, joinRequests.size());
    }

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow("urn:collab:person:example.com:new_user");
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        JoinRequestForm joinRequestForm = new JoinRequestForm(organization.getId(), false, Language.en);

        Map<String, Object> joinRequest = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(joinRequestForm)
                .post("/api/v1/join")
                .as(new TypeRef<>() {
                });
        assertEquals(SHARE_LOGICS, ((Map) joinRequest.get("context")).get("organization"));

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
}