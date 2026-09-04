package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

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

    @SneakyThrows
    @Test
    void loginTimeFrameAnonymousWithServiceProviderIsForbidden() {
        //Security regression test (AUDIT.md #8): an unauthenticated caller must never be able to filter
        ///api/v1/stats/loginTimeFrame by an arbitrary spEntityId - that scope is reserved for authenticated
        //(non-super) users restricted to their own IdP, and for super/owner users
        long from = System.currentTimeMillis();
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("scale", "day")
                .queryParam("spEntityId", "http://mock-sp")
                .get("/api/v1/stats/loginTimeFrame")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @SneakyThrows
    @Test
    void loginTimeFrameAnonymousWithoutServiceProviderIsAllowed() {
        //Security regression test (AUDIT.md #8): the public statistics dashboard calls this endpoint
        //anonymously without a spEntityId for the platform-wide aggregate - that must keep working
        stubFor(get(urlPathMatching("/public/login_time_frame")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        long from = System.currentTimeMillis();
        List<Map<String, Object>> stats = given()
                .when()
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

    //Below: tests for the client-supplied idpEntityId filter (statistics dashboard "select an institute" feature).
    //MANAGE_SUB is a non-owner, non-super user - resolveIdpEntityId restricts it server-side to its own
    //IdP ("http://mock-idp", see AbstractTest#doSeed). SUPER_SUB is a super user and is otherwise unrestricted.
    private static final String OTHER_IDP = "https://attacker-idp.example.org";
    private static final String OWN_IDP = "http://mock-idp";

    @SneakyThrows
    @Test
    void loginTimeFrameIdpEntityIdIgnoredForRestrictedUser() {
        //Security regression test: a user who is restricted to their own IdP must not be able to use the
        //idpEntityId request param to view another institute's statistics
        stubFor(get(urlPathMatching("/public/login_time_frame")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        long from = System.currentTimeMillis();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("scale", "day")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/loginTimeFrame")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/login_time_frame"))
                .withQueryParam("idp_id", equalTo(OWN_IDP)));
    }

    @SneakyThrows
    @Test
    void loginTimeFrameIdpEntityIdHonoredForUnrestrictedUser() {
        //A super user (or SURFnet user) is otherwise unrestricted, so they may narrow results down to
        //one IdP of their own choosing - e.g. by selecting an institute in the statistics dashboard
        stubFor(get(urlPathMatching("/public/login_time_frame")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        long from = System.currentTimeMillis();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("scale", "day")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/loginTimeFrame")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/login_time_frame"))
                .withQueryParam("idp_id", equalTo(OTHER_IDP)));
    }

    @SneakyThrows
    @Test
    void loginTimeFrameAnonymousWithIdpEntityIdIsForbidden() {
        //Security regression test (mirrors loginTimeFrameAnonymousWithServiceProviderIsForbidden): an
        //unauthenticated caller must never be able to filter statistics by an arbitrary idpEntityId either -
        //that scope is reserved for authenticated users
        long from = System.currentTimeMillis();
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("scale", "day")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/loginTimeFrame")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @SneakyThrows
    @Test
    void loginAggregatedIdpEntityIdIgnoredForRestrictedUser() {
        stubFor(get(urlPathMatching("/public/login_aggregated")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("period", "2026")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/loginAggregated")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/login_aggregated"))
                .withQueryParam("idp_id", equalTo(OWN_IDP)));
    }

    @SneakyThrows
    @Test
    void loginAggregatedIdpEntityIdHonoredForUnrestrictedUser() {
        stubFor(get(urlPathMatching("/public/login_aggregated")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("period", "2026")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/loginAggregated")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/login_aggregated"))
                .withQueryParam("idp_id", equalTo(OTHER_IDP)));
    }

    @SneakyThrows
    @Test
    void loginAggregatedWithoutIdpEntityIdSendsNoIdpFilter() {
        stubFor(get(urlPathMatching("/public/login_aggregated")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("period", "2026")
                .get("/api/v1/stats/loginAggregated")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/login_aggregated"))
                .withQueryParam("idp_id", absent()));
    }

    @SneakyThrows
    @Test
    void uniqueLoginCountIdpEntityIdIgnoredForRestrictedUser() {
        stubFor(get(urlPathMatching("/public/unique_login_count")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        long from = System.currentTimeMillis();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("spEntityId", "http://mock-sp")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/uniqueLoginCount")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/unique_login_count"))
                .withQueryParam("idp_id", equalTo(OWN_IDP)));
    }

    @SneakyThrows
    @Test
    void uniqueLoginCountIdpEntityIdHonoredForUnrestrictedUser() {
        stubFor(get(urlPathMatching("/public/unique_login_count")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("[]")));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        long from = System.currentTimeMillis();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("from", from)
                .queryParam("to", from)
                .queryParam("spEntityId", "http://mock-sp")
                .queryParam("idpEntityId", OTHER_IDP)
                .get("/api/v1/stats/uniqueLoginCount")
                .then()
                .statusCode(200);

        verify(getRequestedFor(urlPathMatching("/public/unique_login_count"))
                .withQueryParam("idp_id", equalTo(OTHER_IDP)));
    }

}