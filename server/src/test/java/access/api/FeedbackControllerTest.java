package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static io.restassured.RestAssured.given;

class FeedbackControllerTest extends AbstractTest {

    @Test
    void submitFeedbackWithoutScreenshot() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "message", "This is feedback",
                        "url", "http://localhost/home",
                        "includeScreenshot", false
                ))
                .post("/api/v1/feedback")
                .then()
                .statusCode(HttpStatus.OK.value());
    }

    @Test
    void submitFeedbackWithScreenshot() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        byte[] screenshot = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47};
        String base64 = java.util.Base64.getEncoder().encodeToString(screenshot);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "message", "Feedback with screenshot",
                        "url", "http://localhost/app",
                        "includeScreenshot", true,
                        "screenshotBase64", base64,
                        "screenshotContentType", "image/png"
                ))
                .post("/api/v1/feedback")
                .then()
                .statusCode(HttpStatus.OK.value());
    }

    @Test
    void submitFeedbackRejectsEmptyMessage() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "message", "",
                        "url", "http://localhost/home",
                        "includeScreenshot", false
                ))
                .post("/api/v1/feedback")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    void submitFeedbackRejectsNonPngScreenshot() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        byte[] screenshot = "not-a-png".getBytes();
        String base64 = java.util.Base64.getEncoder().encodeToString(screenshot);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "message", "Feedback with invalid screenshot",
                        "url", "http://localhost/app",
                        "includeScreenshot", true,
                        "screenshotBase64", base64,
                        "screenshotContentType", "text/plain"
                ))
                .post("/api/v1/feedback")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }
}
