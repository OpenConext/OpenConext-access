package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.EntityType;
import tools.jackson.core.JacksonException;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SystemControllerTest extends AbstractTest {

    @Test
    void cronCleanup() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Map<String, Object> result = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/system/cron/cleanup")
                .as(new TypeRef<>() {
                });

        assertTrue(result.containsKey("orgReminders"));
        assertTrue(result.containsKey("orgsDeleted"));
        assertTrue(result.containsKey("usersWarned"));
        assertTrue(result.containsKey("usersDeleted"));
    }

    @Test
    void cronCleanupForbiddenForNonSuperUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/system/cron/cleanup")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void demoSeed() throws JacksonException {
        // Both connections are new (no manageIdentifier), so saveProvider issues a POST
        Map<String, Object> response = Map.of(
                "id", UUID.randomUUID().toString(),
                "version", 0,
                "data", Map.of("metaDataFields", Map.of()));
        stubFor(post(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(response))
                        .withStatus(200)));
        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.saml20_sp, "1");
        stubFor(get(urlMatching("/manage/api/internal/metadata/.*"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(provider))
                        .withStatus(200)));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Map<String, Object> result = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .post("/api/v1/system/seed/demo")
                .as(new TypeRef<>() {
                });

        assertEquals("ok", result.get("status"));

    }

    @Test
    void demoSeedForbiddenForNonSuperUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .post("/api/v1/system/seed/demo")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

}
