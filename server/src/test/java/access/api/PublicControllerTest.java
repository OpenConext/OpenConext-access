package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.EntityType;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class PublicControllerTest extends AbstractTest {

    @Test
    void serviceProviders() {
        this.stubForServiceProviders();
        List<Map<String, Object>> serviceProviders = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/public/service-providers")
                .as(new TypeRef<>() {
                });
        //Three are filtered out because of coin:ss:hidden and coin:ss:idp_visible_only
        assertEquals(5, serviceProviders.size());
    }

    @Test
    void serviceProvidersWithIdp() {
        this.stubForServiceProviders();
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForGetProvider(EntityType.saml20_idp, "8");
        List<Map<String, Object>> serviceProviders = given()
            .when()
            .filter(accessCookieFilter.cookieFilter())
            .header(csrfHeader(accessCookieFilter))
            .accept(ContentType.JSON)
            .contentType(ContentType.JSON)
            .get("/api/v1/public/service-providers?manageIdentifier=8")
            .as(new TypeRef<>() {
            });
        //Only two are filtered out because of coin:ss:hidden and coin:ss:idp_visible_only and internal user
        assertEquals(6, serviceProviders.size());
    }

    @Test
    void serviceProvidersWithAuthenticatedInternalUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForServiceProviders();
        this.stubForIdentityProviderByEntityId("http://mock-idp");
        List<Map<String, Object>> serviceProviders = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/public/service-providers")
                .as(new TypeRef<>() {
                });
        //Only two are filtered out because of coin:ss:hidden and coin:ss:idp_visible_only and internal user
        assertEquals(6, serviceProviders.size());
    }

    @Test
    void serviceProvidersWithAuthenticatedExternalUser() {
        Map<String, Object> body = Map.of("sub", MANAGE_SUB, "schac_home_organization", "eduid.nl");
        AccessCookieFilter accessCookieFilter = mockLoginFlow(body);
        this.stubForServiceProviders();
        this.stubForIdentityProviderByEntityId("http://mock-idp");
        List<Map<String, Object>> serviceProviders = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/public/service-providers")
                .as(new TypeRef<>() {
                });
        //Three are filtered out because of coin:ss:hidden and coin:ss:idp_visible_only and external user
        assertEquals(5, serviceProviders.size());
    }

    @Test
    void identityProviders() {
        this.stubForIdentityProviders();
        List<Map<String, Object>> identityProviders = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/public/identity-providers")
                .as(new TypeRef<>() {
                });
        assertEquals(3, identityProviders.size());
    }

    @SneakyThrows
    @Test
    void serviceProviderDetailAnonymousAllowed() {
        this.stubForGetProvider(EntityType.saml20_sp, "2");
        Map<String, Object> sp = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp.name())
                .pathParam("identifier", "2")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .as(new TypeRef<>() {
                });
        assertEquals("https://network", ((Map) sp.get("data")).get("entityid"));
    }

    @Test
    void serviceProviderDetailInvalidType() {
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_idp.name())
                .pathParam("identifier", "7")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(403);
    }

    @Test
    void serviceProviderDetailAnonymousHidden() {
        this.stubForGetProvider(EntityType.oidc10_rp, "7");
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.oidc10_rp.name())
                .pathParam("identifier", "7")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(403);
    }

    @Test
    void serviceProviderDetailAnonymousIdpVisibleOnly() {
        this.stubForGetProvider(EntityType.saml20_sp, "1");
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp.name())
                .pathParam("identifier", "1")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(403);
    }

    @Test
    void serviceProviderDetailExternalUserAllowed() {
        Map<String, Object> body = Map.of("sub", MANAGE_SUB, "schac_home_organization", "eduid.nl");
        AccessCookieFilter accessCookieFilter = mockLoginFlow(body);
        this.stubForGetProvider(EntityType.saml20_sp, "2");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp.name())
                .pathParam("identifier", "2")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(200);
    }

    @Test
    void serviceProviderDetailExternalUserForbidden() {
        Map<String, Object> body = Map.of("sub", MANAGE_SUB, "schac_home_organization", "eduid.nl");
        AccessCookieFilter accessCookieFilter = mockLoginFlow(body);
        this.stubForGetProvider(EntityType.saml20_sp, "1");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp.name())
                .pathParam("identifier", "1")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(403);
    }

    @Test
    void serviceProviderDetailInternalUserAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForIdentityProviderByEntityId("http://mock-idp");
        this.stubForGetProvider(EntityType.saml20_sp, "1");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp.name())
                .pathParam("identifier", "1")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(200);
    }

    @Test
    void serviceProviderDetailInternalUserForbidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForIdentityProviderByEntityId("http://mock-idp");
        this.stubForGetProvider(EntityType.oidc10_rp, "6");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.oidc10_rp.name())
                .pathParam("identifier", "6")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(403);
    }

    @Test
    void serviceProviderDetailInternalUserHiddenAlwaysForbidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForIdentityProviderByEntityId("http://mock-idp");
        this.stubForGetProvider(EntityType.oidc10_rp, "7");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.oidc10_rp.name())
                .pathParam("identifier", "7")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .then()
                .statusCode(403);
    }
}
