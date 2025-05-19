package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.EntityType;
import access.manage.MetaData;
import access.model.User;
import com.github.tomakehurst.wiremock.verification.LoggedRequest;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Type;
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
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "urn:collab:person:example.com:admin");

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
}