package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;

import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class ConnectionControllerTest extends AbstractTest {

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        Map<String, Object> metaData = Map.of(
                "entityID", "https://engine.test",
                "redirectUrls", List.of("https://redirect.url"),
                "grantTypes", List.of("authorization_code")
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
    void createInvalid() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        Map<String, Object> metaData = Map.of(
                "entityID", "https://engine.test",
                "grants", List.of("authorization_code")
        );

        Connection connection = new Connection("New Connection", application, metaData, EntityType.oidc10_rp, Environment.TEST);
        //Otherwise rest-assured does not deserialize the Application
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", application.getId()));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionData)
                .post("/api/v1/connections")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
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
        connection.setStatus(ConnectionStatus.COMPLETE);
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
        assertEquals(ConnectionStatus.COMPLETE.name(), savedConnection.get("status"));

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

    @SneakyThrows
    @Test
    void findAndSyncWithManage() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        String provider = IOUtils.toString(new ClassPathResource("/manage/playground_rp.json").getInputStream(), Charset.defaultCharset());
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/oidc10_rp/" + MANAGE_IDENTIFIER)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(provider)));

        Connection connection = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", seedIdentifiers.get(BUDDY_CHECK_PROD))
                .get("/api/v1/connections/{connectionId}")
                .as(new TypeRef<>() {
                });
        //See /manage/playground_rp.json
        assertEquals(244, connection.getManageVersion());
        assertEquals(ConnectionStatus.PROD_READY, connection.getStatus());
        List<Map<String, String>> contactPersons = (List<Map<String, String>>) connection.getMetaData().get("contactPersons");
        assertEquals("okke.harsta@surf.nl", contactPersons.getFirst().get("email"));
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

    @Test
    void deleteConnection() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long connectionId = seedIdentifiers.get(BUDDY_CHECK_TEST);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", connectionId)
                .delete("/api/v1/connections/{connectionId}")
                .then()
                .statusCode(204);

        Optional<Connection> optionalConnection = connectionRepository.findById(connectionId);
        assertFalse(optionalConnection.isPresent());
    }

    @Test
    @Disabled
    void deleteConnectionWithManageProvider() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long connectionId = seedIdentifiers.get(BUDDY_CHECK_PROD);

        String url = String.format("/manage/api/internal/metadata/%s/%s", EntityType.oidc10_rp.name(), MANAGE_IDENTIFIER);
        stubFor(delete(urlPathMatching(url))
                .atPriority(1)
                .willReturn(aResponse()
                        .withHeader("Content-Length", "0")
                        .withStatus(204)));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", connectionId)
                .delete("/api/v1/connections/{connectionId}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());

        Optional<Connection> optionalConnection = connectionRepository.findById(connectionId);
        assertFalse(optionalConnection.isPresent());
    }

    @SneakyThrows
    @Test
    void requestProductionStatus() {
        //We can't run transactional here, so we need to manually set references to avoid lazy loading exceptions
        Connection connection = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_TEST)).get();

        Map<String, String> jiraResponse = Map.of("key", "CTX-1000");
        stubFor(post(urlPathMatching("/issue")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(jiraResponse))));

        Map<String, String> manageResponse = Map.of("id", "1");
        stubFor(post(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));

        stubFor(get(urlPathMatching("/manage/api/internal/metadata/oidc10_rp/null")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(Map.of("data", Map.of("entityid", "https://mock-rp"))))));

        Map<String, Object> postManageResponse = Map.of(
                "id", UUID.randomUUID().toString(),
                "version", 1,
                "data", Map.of(
                        "eid", 9L,
                        "state", State.prodaccepted.name(),
                        "metaDataFields", Map.of("secret", "secret")));
        stubFor(post(urlPathMatching("/manage/api/internal/metadata")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(postManageResponse))));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("id", connection.getId())
                .put("/api/v1/connections/request-production-status/{id}")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        Connection connectionFromDB = connectionRepository.findById(connection.getId()).get();
        assertEquals(State.prodaccepted, connectionFromDB.getState());
        assertEquals(ConnectionStatus.PENDING_PROD, connectionFromDB.getStatus());
    }

}