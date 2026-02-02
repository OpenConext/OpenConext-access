package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class StatisticsControllerTest extends AbstractTest {

    @SneakyThrows
    @Test
    void loginTimeFrameWithServiceProvider() {
        stubFor(get(urlPathMatching("/public/login_time_frame")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        long from = System.currentTimeMillis();
        List<Map<String, Object>> stats = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("scale", "day")
                .queryParam("spEntityId", "http://mock-sp")
                .get("/api/v1/stats/loginTimeFrame")
                .as(new TypeRef<>() {
                });
        assertEquals(0, stats.size());
    }

    @SneakyThrows
    @Test
    void loginTimeFrameWithoutServiceProvider() {
        stubFor(get(urlPathMatching("/public/login_time_frame")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", SUPER_SUB);

        long from = System.currentTimeMillis();
        List<Map<String, Object>> stats = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("scale", "day")
                .get("/api/v1/stats/loginTimeFrame")
                .as(new TypeRef<>() {
                });
        assertEquals(0, stats.size());
    }

    @Test
    void loginAggregated() throws Exception {
        stubFor(get(urlPathMatching("/public/login_aggregated")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        List<Map<String, Object>> stats = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("period", "year")
                .queryParam("spEntityId", "http://mock-sp")
                .get("/api/v1/stats/loginAggregated")
                .as(new TypeRef<>() {
                });
        assertEquals(0, stats.size());

    }

    @Test
    void loginAggregatedWithoutServiceProvider() throws Exception {
        stubFor(get(urlPathMatching("/public/login_aggregated")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", SUPER_SUB);

        List<Map<String, Object>> stats = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("period", "year")
                .get("/api/v1/stats/loginAggregated")
                .as(new TypeRef<>() {
                });
        assertEquals(0, stats.size());

    }

    @Test
    void uniqueLoginCount() throws Exception {
        stubFor(get(urlPathMatching("/public/unique_login_count")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        long from = System.currentTimeMillis();
        List<Map<String, Object>> stats = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("spEntityId", "http://mock-sp")
                .get("/api/v1/stats/uniqueLoginCount")
                .as(new TypeRef<>() {
                });
        assertEquals(0, stats.size());
    }


}