package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.UserInfoEnhancer;
import access.model.*;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("unchecked")
class UserControllerTest extends AbstractTest {

    @Test
    void meWithOauth2Login() throws Exception {
        this.stubForStats();
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);
        stubForIdentityProviderByEntityId("http://mock-idp");
        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get(accessCookieFilter.apiURL())
                .as(User.class);
        assertEquals(ADMIN_SUB, user.getEmail());

        Map res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/config")
                .as(Map.class);
        assertTrue((Boolean) res.get("authenticated"));
    }

    @Test
    void meManagerWithOauth2Login() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me",
                MANAGE_SUB, (UserInfoEnhancer)
                        userInfo -> userInfo.put("email", "changed.doe@example.com")
        );
        stubForIdentityProviderByEntityId("http://mock-idp");

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get(accessCookieFilter.apiURL())
                .as(User.class);
        assertEquals("changed.doe@example.com", user.getEmail());
        assertEquals(1, user.getOrganizationMemberships().size());

        Organization organization = user.getOrganizationMemberships().stream().findFirst().get().getOrganization();
        assertEquals("ShareLogics", organization.getName());
    }

    @Test
    void meManagerWithMockLogin() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        stubForIdentityProviderByEntityId("http://mock-idp");

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(User.class);
        assertEquals(1, user.getOrganizationMemberships().size());

        Organization organization = user.getOrganizationMemberships().stream().findFirst().get().getOrganization();
        assertEquals("ShareLogics", organization.getName());
    }

    @Test
    void meMissingAttributes() throws Exception {
        this.stubForStats();
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "",
                m -> {
                    List.of("given_name", "family_name", "schac_home_organization", "email", "name", "nickname",
                                    "preferred_username")
                            .forEach(attr -> m.remove(attr));
                    return m;
                });

        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/config")
                .as(new TypeRef<>() {
                });
        assertEquals(4, ((List) results.get("missingAttributes")).size());
    }


    @Test
    void configUnauthorized() {
        this.stubForStats();
        Map map = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/config")
                .as(Map.class);
        assertFalse((Boolean) map.get("authenticated"));
    }

    @Test
    void meUnauthorized() {
        String location = given()
                .redirects()
                .follow(false)
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .header("Location");
        assertTrue(location.endsWith("/oauth2/authorization/oidcng"));
    }

    @Test
    void otherNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", 1L)
                .get("/api/v1/users/other/{id}")
                .then()
                .statusCode(HttpStatus.CONFLICT.value());
    }

    @Test
    void logout() {
        this.stubForStats();
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/config")
                .as(new TypeRef<>() {
                });
        assertTrue((Boolean) results.get("authenticated"));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/logout")
                .then()
                .statusCode(HttpStatus.OK.value());

        results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/config")
                .as(new TypeRef<>() {
                });
        assertFalse((Boolean) results.get("authenticated"));
    }

    @Test
    void meWithMockLoginMultipleOrganizations() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MULTIPLE_ORG_SUB);
        stubForIdentityProviderByEntityId("http://mock-idp");

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(User.class);
        assertEquals(2, user.getOrganizationMemberships().size());

        List<String> names = user.getOrganizationMemberships().stream()
                .map(organizationMembership -> organizationMembership.getOrganization().getName()).
                sorted()
                .toList();
        assertEquals(List.of(LOGISTICS, SHARE_LOGICS), names);
    }

    @Test
    void meNewUserWithExistingOrganizationTestLogin() {
        Map<String, Object> attributes = Map.of(
                "eduperson_principal_name", "debby@sharelogics.org",
                "email", "debby@sharelogics.org",
                "family_name", "Davids",
                "given_name", "Debby",
                "name", "Debby Davids",
                "schac_home_organization", "sharelogics.org",
                "sub", "urn:collab:person:providence:new");
        AccessCookieFilter accessCookieFilter = mockLoginFlow(attributes);
        stubForIdentityProviderByEntityId("http://mock-idp");

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(new TypeRef<>() {
                });
        assertEquals(1, user.getOrganizationMemberships().size());

        Organization organization = user.getOrganizationMemberships().stream().findFirst().get().getOrganization();
        assertEquals(SHARE_LOGICS, organization.getName());
        assertEquals(attributes.get("schac_home_organization"), organization.getSchacHomeOrganization());
    }

    @Test
    void createOrganizationForInstitutionAdmin() throws Exception {
        super.stubForIdentityProviderByInstitutionalGUID(ORGANISATION_GUID);

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
                institutionalAdminEntitlementOperator(ORGANISATION_GUID));
        Map<String, Object> res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(new TypeRef<>() {
                });
        User user = objectMapper.convertValue(res, User.class);
        assertTrue(user.isInstitutionAdmin());
        assertEquals(ORGANISATION_GUID, user.getOrganizationGUID());
        assertEquals(1, user.getOrganizationMemberships().size());

        OrganizationMembership organizationMembership = user.getOrganizationMemberships().iterator().next();
        assertEquals("Mock IdP EN (SURF bv)", organizationMembership.getOrganization().getName());
        assertEquals(Authority.ADMIN, organizationMembership.getAuthority());

        Institution institution = user.getInstitution();
        assertEquals("http://mock-idp", institution.getEntityID());
        assertEquals("SURF bv", institution.getOrganizationName());
        assertEquals("Mock IdP EN", institution.getName());
    }

    @Test
    void searchSuperUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Map<String, Object> results = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("query","doe")
                .queryParam("pageNumber", 0)
                .queryParam("pageSize", 10)
                .queryParam("sort", "name")
                .queryParam("sortDirection", Sort.Direction.ASC)
                .get("/api/v1/users/search")
                .as(new TypeRef<>() {
                });
        assertEquals(4, ((List)results.get("content")).size());
    }

    @SneakyThrows
    protected void stubForStats() {
        Map<String, Long> stats = Map.of();
        String body = objectMapper.writeValueAsString(stats);
        stubFor(get("/manage/api/internal/stats")
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

}