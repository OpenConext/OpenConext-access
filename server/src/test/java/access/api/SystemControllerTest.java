package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static io.restassured.RestAssured.given;
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

}
