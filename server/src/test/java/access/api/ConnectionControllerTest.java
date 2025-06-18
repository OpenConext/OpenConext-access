package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ConnectionControllerTest extends AbstractTest {

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        Map<String, Object> metaData = Map.of(
                "entityID", "https://engine.test",
                "redirect_urls", List.of("https://redirect.url"),
                "grants", List.of("authorization_code")
        );

        Connection connection = new Connection("New Connection", application, metaData, EntityType.oidc10_rp, Environment.TEST);
        //Otherwise rest-assured does not deserialize the Application
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
        //Otherwise rest-assured does not deserialize the Application
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", seedIdentifiers.get(BUDDY_CHECK)));

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

    @Test
    void updateAndComplete() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Connection connection = connectionRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK_TEST)).get();
        connection.setStatus(Status.COMPLETE);
        //Otherwise rest-assured does not deserialize the Application
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", seedIdentifiers.get(BUDDY_CHECK)));

        super.stubForSaveProvider(connection);

        Map<String, Object> savedConnection = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionData)
                .put("/api/v1/connections")
                .as(new TypeRef<>() {
                });
        String manageIdentifier = (String) savedConnection.get("manageIdentifier");
        assertNotNull(manageIdentifier);
        assertEquals(0, savedConnection.get("manageVersion"));
        assertEquals(Status.COMPLETE.name(), savedConnection.get("status"));

        //Now do a find, which needs stubbing for getProvider
        connection.setManageIdentifier(manageIdentifier);
        stubForGetProvider(connection);
        Connection connectionFromFind = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", connection.getId())
                .get("/api/v1/connections/{connectionId}")
                .as(new TypeRef<>() {
                });
        assertEquals(manageIdentifier, connectionFromFind.getManageIdentifier());
        assertEquals("https://engine.test.surfconext.nl", connectionFromFind.getMetaData().get("entityID"));
    }

    @Test
    void resetSecret() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Map<String, String> newSecret = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", seedIdentifiers.get(BUDDY_CHECK_TEST))
                .put("/api/v1/connections/reset-secret/{connectionId}")
                .as(new TypeRef<>() {
                });
        Connection connection = connectionRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK_TEST)).get();
        assertEquals(newSecret.get("secret"), connection.getMetaData().get("secret"));
    }
}