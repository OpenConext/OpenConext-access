package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.Contact;
import access.manage.MetaData;
import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ConnectionControllerTest extends AbstractTest {

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        Map<String, Object> metaData = Map.of(
                "entityid", "https://engine.test",
                "redirect_urls", List.of("https://redirect.url") ,
                "grants", List.of("authorization_code")
        );

        Connection connection = new Connection("New Connection", application, metaData, Protocol.OIDC, Environment.TEST);
        //Otherwise rest-assured does not deserialize the Organization
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", application.getId()));

        Connection savedConnection = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionData)
                .post("/api/v1/connections")
                .as(Connection.class);

        Connection connectionFromDB = connectionRepository.findById(savedConnection.getId()).get();
        assertEquals(connection.getName(), connectionFromDB.getName());
        assertEquals(metaData, connectionFromDB.getMetaData());
    }

    @Test
    void update() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Connection connection = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_TEST)).get();
        connection.setName("Changed");
        //Otherwise rest-assured does not deserialize the Organization
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        connectionData.put("application", Map.of("id", application.getId()));

        Connection savedConnection = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionData)
                .put("/api/v1/connections")
                .as(Connection.class);

        Connection connectionFromDB = connectionRepository.findById(savedConnection.getId()).get();
        assertEquals(connection.getName(), connectionFromDB.getName());
    }
}
