package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;

import static io.restassured.RestAssured.given;

@TestPropertySource(properties = "config.demo-seed-enabled=false")
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
