package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.Organization;
import access.model.OrganizationStatus;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class OrganizationControllerTest extends AbstractTest {

    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        stubForGetChangeRequests(getChangeRequests());

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
        assertEquals(2, organization.getJoinRequests().size());
        assertEquals(1L, organization.getApplicationCount());
    }

    @Test
    void pendingApproval() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        List<Organization> organizations = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/organizations/status/pending")
                .as(new TypeRef<>() {
                });

        assertEquals(3, organizations.size());
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
    void users() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Map<String, Object> res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/users/{id}")
                .as(new TypeRef<>() {
                });
        assertEquals(2, List.class.cast(res.get("organizationMemberships")).size());
    }

    @Test
    void invitation() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Map<String, Object> map = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParams("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/invitation/{id}")
                .as(new TypeRef<>() {
                });
        assertEquals(1, ((List) map.get("applications")).size());
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

        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("query", "logi")
                .queryParam("pageNumber", 0)
                .queryParam("pageSize", 10)
                .queryParam("sort", "name")
                .queryParam("sortDirection", Sort.Direction.ASC)
                .get("/api/v1/organizations/search")
                .as(new TypeRef<>() {
                });

        List content = (List) results.get("content");
        assertEquals(1, content.size());
        Map<String, Object> organization = (Map<String, Object>) content.getFirst();
        assertEquals(1, organization.get("memberCount"));
        assertEquals(0, organization.get("applicationCount"));
    }

    @Test
    void searchWithoutQuery() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("pageNumber", 0)
                .queryParam("pageSize", 10)
                .queryParam("sort", "applicationCount")
                .queryParam("sortDirection", Sort.Direction.ASC)
                .get("/api/v1/organizations/search")
                .as(new TypeRef<>() {
                });

        List content = (List) results.get("content");
        assertEquals(3, content.size());
    }

    @Test
    void searchWithoutQuerySortMemberCount() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("pageNumber", 2)
                .queryParam("pageSize", 1)
                .queryParam("sort", "memberCount")
                .queryParam("sortDirection", Sort.Direction.DESC)
                .get("/api/v1/organizations/search")
                .as(new TypeRef<>() {
                });

        List content = (List) results.get("content");
        assertEquals(1, content.size());
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
                .statusCode(204);

        Optional<Organization> optionalOrganization = organizationRepository.findById(organizationId);
        assertFalse(optionalOrganization.isPresent());
    }

    @Test
    void approve() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Long organizationId = seedIdentifiers.get(SHARE_LOGICS);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organizationId)
                .pathParam("status", OrganizationStatus.DISAPPROVED)
                .put("/api/v1/organizations/status/{organizationId}/{status}")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        Organization organization = organizationRepository.findById(organizationId).get();
        assertEquals(OrganizationStatus.DISAPPROVED, organization.getStatus());
    }

}