package access.api;

import access.AbstractTest;
import access.model.EntityType;
import access.model.Environment;
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
        assertEquals(7, serviceProviders.size());
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
        Map<String, Object> provider = localManage.providerById(EntityType.saml20_sp, "1", Environment.PROD);
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
        assertEquals("education", ((Map)((Map)sp.get("data")).get("metaDataFields")).get("application_tags"));
    }
}