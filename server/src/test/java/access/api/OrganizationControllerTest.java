package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.Organization;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class OrganizationControllerTest extends AbstractTest {

    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Organization organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/find/{id}")
                .as(Organization.class);

        assertEquals(2L, organization.getMemberCount());
        assertEquals(1, organization.getApplications().size());
        assertEquals(1, organization.getJoinRequests().size());
        assertEquals(1L, organization.getApplicationCount());
    }

    @Test
    void light() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Organization organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/light/{id}")
                .as(Organization.class);

        assertEquals(2, organization.getMemberCount());
        assertEquals(1L, organization.getApplicationCount());
        assertNull(organization.getApplications());
    }

    @Test
    void name() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Map<String, Object> map = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/name/{id}")
                .as(new TypeRef<>() {
                });

        assertEquals(SHARE_LOGICS, map.get("name"));
    }

    @Test
    void findForbidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/find/{id}")
                .then()
                .statusCode(403);
    }

    @Test
    void search() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        List<Organization> organizations = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("query", "logi")
                .get("/api/v1/organizations/search")
                .as(new TypeRef<>() {
                });

        assertEquals(2, organizations.size());
    }

    @Test
    void createWithEduIdUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Organization organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("name", "Brand New World !!!"))
                .post("/api/v1/organizations")
                .as(Organization.class);

        Organization organizationFromDB = organizationRepository.findById(organization.getId()).get();
        assertEquals("brand_new_world.eduid.nl", organizationFromDB.getSchacHomeOrganization());
    }

    @Test
    void createWithInstitutionalUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Organization organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("name", "Brand New World !!!"))
                .post("/api/v1/organizations")
                .as(Organization.class);

        Organization organizationFromDB = organizationRepository.findById(organization.getId()).get();
        assertEquals("example.com", organizationFromDB.getSchacHomeOrganization());
    }

    @Test
    void delete() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long organizationId = seedIdentifiers.get(SHARE_LOGICS);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organizationId)
                .delete("/api/v1/organizations/{organizationId}")
                .then()
                .statusCode(200);

        Optional<Organization> optionalOrganization = organizationRepository.findById(organizationId);
        assertFalse(optionalOrganization.isPresent());
    }

}