package access.api;

import access.AbstractMailTest;
import access.AccessCookieFilter;
import access.model.Authority;
import access.model.JoinRequest;
import access.model.Language;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.request.JoinRequestApproval;
import access.request.JoinRequestForm;
import com.fasterxml.jackson.core.JsonProcessingException;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class UserControllerFeedbackTest extends AbstractMailTest {

    @Test
    void feedback() throws JsonProcessingException {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        Map<String, String> body = Map.of("message", "improve");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(objectMapper.writeValueAsString(body))
                .post("/api/v1/users/feedback")
                .then()
                .statusCode(HttpStatus.OK.value());

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains(body.get("message")));
    }

    @Test
    void noFeedback() throws JsonProcessingException {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        Map<String, String> body = Map.of("message", "");
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(objectMapper.writeValueAsString(body))
                .post("/api/v1/users/feedback")
                .then()
                .statusCode(HttpStatus.OK.value());

        super.confirmNoMailMessages();
    }
}