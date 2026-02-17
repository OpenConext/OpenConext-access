package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.*;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings({"unchecked", "unsafe"})
class OrganizationControllerTest extends AbstractTest {

    @Test
    void details() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        stubForGetChangeRequests(getChangeRequests());

        Organization organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/details/{id}")
                .as(Organization.class);

        assertEquals(2L, organization.getApplicationCount());
        assertEquals(3L, organization.getMemberCount());
        assertEquals(2, organization.getJoinRequests().size());
        assertEquals(1, organization.getInvitations().size());
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
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/light/{id}")
                .as(Organization.class);

        assertEquals(3, organization.getMemberCount());
        assertEquals(2L, organization.getApplicationCount());
        assertNull(organization.getApplications());
    }

    @Test
    void users() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Map<String, Object> organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/users/{id}")
                .as(new TypeRef<>() {
                });
        assertEquals(3, List.class.cast(organization.get("organizationMemberships")).size());
        assertNull(organization.get("applications"));
        assertNull(organization.get("invitations"));
        assertNull(organization.get("joinRequests"));
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
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/invitation/{id}")
                .as(new TypeRef<>() {
                });
        assertEquals(2, ((List) map.get("applications")).size());
        assertEquals(SHARE_LOGICS, map.get("name"));
    }

    @Test
    void detailsForbidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/details/{id}")
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

        super.stubForDeleteProvider(EntityType.oidc10_rp, MANAGE_IDENTIFIER);

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

    @Test
    void mineOrganizationWithIdentityProvider() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        //See seed for SHARE_LOGICS, which has a manage identifier of "7"
        stubForGetProvider(EntityType.saml20_idp, "7", Environment.PROD);

        Map<String, Object> organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/mine/{id}")
                .as(new TypeRef<>() {
                });
        assertEquals(11, ((Map) organization.get("metaData")).size());
        assertNull(organization.get("applications"));
        assertNull(organization.get("invitations"));
        assertNull(organization.get("joinRequests"));
        assertNull(organization.get("organizationMemberships"));
    }

    @Test
    void organizationWithApplications() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        //See seed for SHARE_LOGICS, which has a production connection
        stubForGetChangeRequests(getChangeRequests());

        Map<String, Object> organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/applications/{id}")
                .as(new TypeRef<>() {
                });
        //Assert that there are 2 applications, BuddyCheck has 2 connections and the PROD connection has change requests
        List<Map<String, Object>> applications = (List) organization.get("applications");
        assertEquals(2, applications.size());
        assertEquals(0, ((Map) organization.get("metaData")).size());

        Map<String, Object> buddyCheckApp = applications.stream().filter(app -> app.get("name").equals(BUDDY_CHECK))
                .findFirst().get();
        List<Map<String, Object>> connections = (List<Map<String, Object>>) buddyCheckApp.get("connections");
        Map<String, Object> buddyCheckProd = connections.stream().filter(conn -> conn.get("environment").equals(Environment.PROD.name()))
                .findFirst().get();
        List<Map<String, Object>> changeRequests = (List<Map<String, Object>>) buddyCheckProd.get("changeRequests");
        assertEquals(2, changeRequests.size());
    }

    @Test
    void organizationWithApplicationsScopedForGuest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);

        //See seed for SHARE_LOGICS, which has a production connection
        stubForGetChangeRequests(getChangeRequests());

        Map<String, Object> organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/organizations/applications/{id}")
                .as(new TypeRef<>() {
                });
        //Assert that there are 2 applications, BuddyCheck has 2 connections and the PROD connection has change requests
        List<Map<String, Object>> applications = (List) organization.get("applications");
        //The application Techno has been removed because of Guest status
        assertEquals(1, applications.size());
    }

    @Test
    void organizationWithApplicationsNotFound() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", -1)
                .get("/api/v1/organizations/applications/{id}")
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    void organizationWithApplicationsForBidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        Long farWindIdentifier = seedIdentifiers.get(FAR_WIND);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", farWindIdentifier)
                .get("/api/v1/organizations/applications/{id}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void updateExternalOrganization() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Long organizationId = seedIdentifiers.get(FAR_WIND);

        OrganizationForm organizationForm = new OrganizationForm(organizationId, "Changed", Map.of());
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(organizationForm)
                .put("/api/v1/organizations/")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        Organization organization = organizationRepository.findById(organizationId).get();
        assertEquals(organizationForm.getName(), organization.getName());
    }

    @Test
    void updateInternalOrganizationNotAllow() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Long organizationId = seedIdentifiers.get(LOGISTICS);

        OrganizationForm organizationForm = new OrganizationForm(organizationId, "Changed", Map.of());
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(organizationForm)
                .put("/api/v1/organizations/")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

    @SneakyThrows
    @Test
    void updateInternalOrganizationMetaData() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Long organizationId = seedIdentifiers.get(LOGISTICS);
        Map<String, Object> metaData = objectMapper.readValue(new ClassPathResource("/client-metadata/update-organization.json").getInputStream(), Map.class);

        stubForGetProvider(EntityType.saml20_idp, "8", Environment.PROD);
        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody("{}")
                        .withStatus(200)));


        Map<String, Object> organization = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(metaData)
                .pathParam("organizationId", organizationId)
                .put("/api/v1/organizations/metadata/{organizationId}")
                .as(new TypeRef<>() {
                });

        assertEquals(metaData, organization.get("metaData"));
    }

    @Test
    void updateExternalOrganizationMetaDataNotAllow() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Long organizationId = seedIdentifiers.get(FAR_WIND);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of())
                .pathParam("organizationId", organizationId)
                .put("/api/v1/organizations/metadata/{organizationId}")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }
}