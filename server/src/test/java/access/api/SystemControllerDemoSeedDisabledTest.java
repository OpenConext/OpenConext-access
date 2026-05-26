package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static io.restassured.RestAssured.given;

/**
 * Tests the demo seed endpoint when config.demo-seed-enabled=false (the default).
 * Uses a separate class so the Spring context is loaded with the base application.yml
 * value (false), without the override applied in SystemControllerDemoSeedTest.
 */
class SystemControllerDemoSeedDisabledTest extends AbstractTest {

    @Test
    void demoSeedNotAllowedWhenFeatureDisabled() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .post("/api/v1/system/seed/demo")
                .then()
                .statusCode(HttpStatus.CONFLICT.value());
    }

}
