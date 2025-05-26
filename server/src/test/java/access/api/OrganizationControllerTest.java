package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.Organization;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

class OrganizationControllerTest extends AbstractTest {

    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Organization organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/find/{id}")
                .as(Organization.class);

        assertEquals(1, organization.getMemberCount());
        assertEquals(1, organization.getApplications().size());
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
}