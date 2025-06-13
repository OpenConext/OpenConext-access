package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.EntityType;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SuppressWarnings("unchecked")
class ManageControllerTest extends AbstractTest {


    @Test
    void parseForbidden() {
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("url", "https://engine.test.surfconext.nl/authentication/sp/metadata"))
                .post("/api/v1/manage/parse")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

    }

    @Test
    void parse() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        List<Map<String, Object>> metaDataList = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("url", "https://engine.test.surfconext.nl/authentication/sp/metadata"))
                .post("/api/v1/manage/parse")
                .as(new TypeRef<>() {
                });
        assertEquals(1, metaDataList.size());
        Map<String, Object> metaData = metaDataList.getFirst();
        assertEquals("SURFconext TEST EngineBlock", metaData.get("name"));

    }

    @Test
    void identityProviders() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForIdentityProviders();
        List<Map<String, Object>> identityProviders = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/manage/identity-providers")
                .as(new TypeRef<>() {
                });
        assertEquals(3, identityProviders.size());
    }

    @SneakyThrows
    protected void stubForIdentityProviders() {
        List<Map<String, Object>> providers = localManage.providers(EntityType.SAML20_IDP);
        String body = objectMapper.writeValueAsString(providers);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_idp"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));

    }

}