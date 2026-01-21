package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

class InviteControllerTest extends AbstractTest {

    @SneakyThrows
    @Test
    void rolesPerOrganizationInviteApplication() {
        List<Map<String, Object>> roles = objectMapper.readValue(new ClassPathResource("/invite/roles.json").getInputStream(), new TypeReference<>() {
        });
        String rolesResult = objectMapper.writeValueAsString(roles);

        //Does not matter
        String applicationManageId = UUID.randomUUID().toString();

        stubFor(get(urlPathMatching("/api/external/v1/internal/invite/roles/" + ORGANISATION_GUID + "/" + applicationManageId)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(rolesResult)));

        super.stubForIdentityProviderByEntityId("http://mock-idp");
        super.stubForGetChangeRequests(getChangeRequests());

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
                institutionalAdminEntitlementOperator(ORGANISATION_GUID));
        //This will create an institution admin with the ORGANISATION_GUID as organizationGUID
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me");

        List<Map<String, Object>> inviteRoles = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationGUID", ORGANISATION_GUID)
                .pathParam("applicationManageId", applicationManageId)
                .get("/api/v1/invite/roles/{organizationGUID}/{applicationManageId}")
                .as(new TypeRef<>() {
                });

        assertEquals(1, inviteRoles.size());
        assertEquals("Test Role Profile", inviteRoles.getFirst().get("name"));
    }

    @SneakyThrows
    @Test
    void rolesPerOrganizationInviteApplicationSuperUser() {
        List<Map<String, Object>> roles = objectMapper.readValue(new ClassPathResource("/invite/roles.json").getInputStream(), new TypeReference<>() {
        });
        String rolesResult = objectMapper.writeValueAsString(roles);

        //Does not matter
        String applicationManageId = UUID.randomUUID().toString();

        stubFor(get(urlPathMatching("/api/external/v1/internal/invite/roles/" + ORGANISATION_GUID + "/" + applicationManageId)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(rolesResult)));

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", SUPER_SUB);

        List<Map<String, Object>> inviteRoles = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationGUID", ORGANISATION_GUID)
                .pathParam("applicationManageId", applicationManageId)
                .get("/api/v1/invite/roles/{organizationGUID}/{applicationManageId}")
                .as(new TypeRef<>() {
                });

        assertEquals(1, inviteRoles.size());
        assertEquals("Test Role Profile", inviteRoles.getFirst().get("name"));
    }

    @SneakyThrows
    @Test
    void rolesPerOrganizationInviteApplicationNotAllowed() {
        super.stubForIdentityProviderByEntityId("http://mock-idp");
        super.stubForGetChangeRequests(getChangeRequests());

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
                institutionalAdminEntitlementOperator(ORGANISATION_GUID));
        //This will create an institution admin with the ORGANISATION_GUID as organizationGUID
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me");

        //Does not matter
        String applicationManageId = UUID.randomUUID().toString();

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationGUID", "nope")
                .pathParam("applicationManageId", applicationManageId)
                .get("/api/v1/invite/roles/{organizationGUID}/{applicationManageId}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @SneakyThrows
    @Test
    void rolesPerOrganizationInviteApplicationServerSideRequestForgery() {
        //Not a valid UUID
        String applicationManageId = "nope";

        super.stubForIdentityProviderByEntityId("http://mock-idp");
        super.stubForGetChangeRequests(getChangeRequests());

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "new_institution_admin",
                institutionalAdminEntitlementOperator(ORGANISATION_GUID));
        //This will create an institution admin with the ORGANISATION_GUID as organizationGUID
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me");

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationGUID", ORGANISATION_GUID)
                .pathParam("applicationManageId", applicationManageId)
                .get("/api/v1/invite/roles/{organizationGUID}/{applicationManageId}")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

}