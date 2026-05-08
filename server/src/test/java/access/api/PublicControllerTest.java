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
    void serviceProviderDetail() {
        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.saml20_sp, "1");
        String body = objectMapper.writeValueAsString(provider);
        stubFor(get(String.format("/manage/api/internal/metadata/%s/%s",
                EntityType.saml20_sp.name(),
                "1"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
        Map<String, Object> sp = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp.name())
                .pathParam("identifier", "1")
                .get("/api/v1/public/service-provider-detail/{type}/{identifier}")
                .as(new TypeRef<>() {
                });
        assertEquals(List.of("education"), ((Map)((Map)sp.get("data")).get("metaDataFields")).get("application_tags"));
    }
}