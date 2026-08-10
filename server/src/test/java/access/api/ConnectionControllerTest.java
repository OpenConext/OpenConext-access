package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.ManageData;
import access.model.Application;
import access.model.Connection;
import access.model.ConnectionStatus;
import access.model.EntityType;
import access.model.GrantType;
import access.model.State;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Type;
import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings({"unchecked", "unsafe"})
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

        Connection connection = new Connection("New Connection", application, metaData, EntityType.oidc10_rp);
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

        Connection connection = new Connection("New Connection", application, metaData, EntityType.oidc10_rp);
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
        Map<String, Object> idp = super.stubForIdentityProviderByEntityId("http://mock-idp");
        super.stubForSaveIdentityProvider(idp);
        super.stubForGetProvider(EntityType.saml20_idp, "7");

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
    void updateAndCreateChangeRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Connection connection = connectionRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        //See server/src/main/resources/manage/oidc10_rp.json
        connection.setManageIdentifier("5");
        connection.setStatus(ConnectionStatus.PROD_READY);
        connectionRepository.save(connection);

        Map<String, Object> metaData = connection.getMetaData();
        List<String> grantTypes = (List<String>) metaData.get("grantTypes");
        grantTypes.add(GrantType.DEVICE_CODE.name().toLowerCase());
        List<String> redirectUrls = (List<String>) metaData.get("redirectUrls");
        redirectUrls.add("https://redirect.nl");
        metaData.put("claimsInIdToken", true);

        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.oidc10_rp, "10");
        metaData.put("arp", ManageData.getData(provider).get("arp"));

        //Otherwise rest-assured does not deserialize the Application
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", seedIdentifiers.get(BUDDY_CHECK)));

        //Now stub all interaction with Manage (getProvider, saveChangeRequests, getChangeRequests)
        super.stubForGetProvider(connection);
        Map<String, String> manageResponse = Map.of("id", "1");
        stubFor(post(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));
        stubFor(put(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));

        List<Map<String, Object>> existingChangeRequests = getChangeRequests();
        Map<String, Object> existingChangeRequest = existingChangeRequests.getFirst();
        Map<String, Object> pathUpdates = (Map<String, Object>) existingChangeRequest.get("pathUpdates");
        pathUpdates.put("arp", ManageData.getData(provider).get("arp"));

        super.stubForGetChangeRequests(existingChangeRequests);

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
        assertEquals(1, savedConnection.get("manageVersion"));
        assertEquals(ConnectionStatus.PROD_READY.name(), savedConnection.get("status"));

        //Assert the changeRequests
        List<Map<String, Object>> changeRequests = (List<Map<String, Object>>) savedConnection.get("changeRequests");
        assertEquals(2, changeRequests.size());
    }

    @SneakyThrows
    @Test
    void updateAndCreateChangeRequestWithArp() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Connection connection = connectionRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        //See server/src/main/resources/manage/oidc10_rp.json
        connection.setManageIdentifier("10");
        connection.setStatus(ConnectionStatus.PROD_READY);
        connectionRepository.save(connection);

        Map<String, Object> metaData = connection.getMetaData();
        List<String> grantTypes = (List<String>) metaData.get("grantTypes");
        grantTypes.add(GrantType.DEVICE_CODE.name().toLowerCase());
        List<String> redirectUrls = (List<String>) metaData.get("redirectUrls");
        redirectUrls.add("https://redirect.nl");
        metaData.put("claimsInIdToken", true);

        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.oidc10_rp, "10");
        metaData.put("arp", ManageData .getData(provider).get("arp"));

        //Otherwise rest-assured does not deserialize the Application
        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", seedIdentifiers.get(BUDDY_CHECK)));

        //Now stub all interaction with Manage (getProvider, saveChangeRequests, getChangeRequests)
        super.stubForGetProvider(connection);
        Map<String, String> manageResponse = Map.of("id", "1");
        stubFor(post(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));
        stubFor(put(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));
        //This ensures a new change request is created
        super.stubForGetChangeRequests(List.of());

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
        assertEquals(1, savedConnection.get("manageVersion"));
        assertEquals(ConnectionStatus.PROD_READY.name(), savedConnection.get("status"));
    }

    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Connection connection = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();

        Map<String, Map<String, Object>> data = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("manageType", connection.getProtocol())
                .pathParam("manageIdentifier", connection.getManageIdentifier())
                .get("/api/v1/connections/{manageType}/{manageIdentifier}")
                .as(new TypeRef<>() {
                });

        assertEquals(connection.getId().intValue(), data.get("connection").get("id"));
    }

    @Test
    void find404() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("manageType", EntityType.oidc10_rp)
                .pathParam("manageIdentifier", "nope")
                .get("/api/v1/connections/{manageType}/{manageIdentifier}")
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());

    }

    @SneakyThrows
    @Test
    void findAndSyncWithManage() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        String provider = IOUtils.toString(new ClassPathResource("/manage/playground_rp.json").getInputStream(), Charset.defaultCharset());
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/oidc10_rp/" + MANAGE_IDENTIFIER)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(provider)));
        stubForGetChangeRequests(getChangeRequests());

        Map<String, Object> connection = given()
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
        assertEquals(244, connection.get("manageVersion"));
        assertEquals(ConnectionStatus.PROD_READY.name(), connection.get("status"));
        assertEquals(2, ((List) connection.get("changeRequests")).size());
    }

    @SneakyThrows
    @Test
    void findChangeRequests() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        String body = IOUtils.toString(new ClassPathResource("/manage/change_requests.json").getInputStream(), Charset.defaultCharset());
        String url = String.format("/manage/api/internal/change-requests/%s/%s", EntityType.oidc10_rp, MANAGE_IDENTIFIER);
        stubFor(get(urlPathMatching(url)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));

        List<Map<String, Object>> changeRequests = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", seedIdentifiers.get(BUDDY_CHECK_PROD))
                .get("/api/v1/connections/change-requests/{connectionId}")
                .as(new TypeRef<>() {
                });
        assertEquals(2, changeRequests.size());
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
    void deleteConnectionWithManageProvider() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long connectionId = seedIdentifiers.get(BUDDY_CHECK_PROD);

        super.stubForDeleteProvider(EntityType.oidc10_rp, MANAGE_IDENTIFIER);

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
    void updateConnectionRequestProductionStatus() {
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
        stubForGetProvider(EntityType.saml20_idp, "7");
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
                .body(connection)
                .put("/api/v1/connections/update-request-production-status")
                .then()
                .statusCode(HttpStatus.CREATED.value());

        Connection connectionFromDB = connectionRepository.findById(connection.getId()).get();
        assertEquals(State.prodaccepted, connectionFromDB.getState());
        assertEquals(ConnectionStatus.PENDING_PROD, connectionFromDB.getStatus());
    }

    @Test
    void identityProvidersByAllowedConnections() throws JsonProcessingException {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Long connectionId = seedIdentifiers.get(BUDDY_CHECK_PROD);

        List<Connection> connections = List.of(
                connection(EntityType.saml20_sp, "4"),
                connection(EntityType.oidc10_rp, "5")
        );
        List<Map<String, Object>> identityProviders = localManage.identityProvidersByAllowedConnections(connections);
        String body = objectMapper.writeValueAsString(identityProviders);
        stubFor(post(urlEqualTo("/manage/api/internal/delete-consequences")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));

        List<Map<String, Object>> providers = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("connectionId", connectionId)
                .get("/api/v1/connections/identity-providers-allowed-connections/{connectionId}")
                .as(new TypeRef<>() {
                });

        assertEquals(2, providers.size());
    }

}
