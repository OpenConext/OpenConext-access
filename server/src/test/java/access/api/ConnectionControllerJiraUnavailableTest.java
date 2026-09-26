package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.ManageData;
import access.model.Connection;
import access.model.ConnectionStatus;
import access.model.EntityType;
import access.model.GrantType;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.core.type.TypeReference;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

//Regression test for: "When a change is requested, but Jira is unavailable, no change request is created in
//Manage." Runs with a real (WireMock-backed) Jira endpoint - jira.enabled=false everywhere else in this test
//suite means JiraClient#create never makes an HTTP call at all, so it can never exercise this failure path.
//Properties are restated in full (matching AbstractTest's own list, jira.enabled flipped to true) rather than
//relying on cross-class property merging, following the same pattern JiraClientTest uses against AbstractMailTest.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "oidcng.introspect-url=http://localhost:8081/introspect",
                "spring.security.oauth2.client.provider.oidcng.authorization-uri=http://localhost:8081/authorization",
                "spring.security.oauth2.client.provider.oidcng.token-uri=http://localhost:8081/token",
                "spring.security.oauth2.client.provider.oidcng.user-info-uri=http://localhost:8081/user-info",
                "spring.security.oauth2.client.provider.oidcng.jwk-set-uri=http://localhost:8081/jwk-set",
                "manage.url=http://localhost:8081",
                "manage.enabled=true",
                "jira.enabled=true",
                "jira.base-url=http://localhost:8081",
                "s3storage.url=http://localhost:8081"
        })
class ConnectionControllerJiraUnavailableTest extends AbstractTest {

    @SuppressWarnings("unchecked")
    @SneakyThrows
    @Test
    void changeRequestIsStillCreatedInManageAndPersistedLocallyWhenJiraIsDown() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Connection connection = connectionRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        //See server/src/main/resources/manage/oidc10_rp.json - manageIdentifier "10" resolves to this entityid,
        //with name:en "OIDC Playground Client" and version 1
        connection.setManageIdentifier("10");
        connection.setStatus(ConnectionStatus.PROD_READY);
        //Overwritten by Connection#mergeMetaData (rebuilt from Manage's provider data) only if the local save
        //that is supposed to happen despite the Jira failure actually commits - the assertion below relies on this
        connection.setName("Name-before-the-request");
        connectionRepository.save(connection);

        Map<String, Object> metaData = connection.getMetaData();
        List<String> grantTypes = (List<String>) metaData.get("grantTypes");
        grantTypes.add(GrantType.DEVICE_CODE.name().toLowerCase());
        List<String> redirectUrls = (List<String>) metaData.get("redirectUrls");
        redirectUrls.add("https://redirect.nl");
        metaData.put("claimsInIdToken", true);
        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.oidc10_rp, "10");
        metaData.put("arp", ManageData.getData(provider).get("arp"));

        Map<String, Object> connectionData = objectMapper.convertValue(connection, new TypeReference<>() {
        });
        connectionData.put("application", Map.of("id", seedIdentifiers.get(BUDDY_CHECK)));

        //Manage: the change request must still be created here despite Jira being down
        super.stubForGetProvider(connection);
        super.stubForGetChangeRequests(List.of());
        stubFor(post(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
            .withHeader("Content-Type", "application/json")
            .withBody(objectMapper.writeValueAsString(Map.of("id", "1")))));

        //Jira: simulate an outage
        stubFor(post(urlPathMatching("/issue")).willReturn(aResponse()
            .withStatus(500)
            .withHeader("Content-Type", "application/json")
            .withBody("{\"errorMessages\":[\"Jira is down\"]}")));

        given()
            .when()
            .filter(accessCookieFilter.cookieFilter())
            .header(csrfHeader(accessCookieFilter))
            .accept(ContentType.JSON)
            .contentType(ContentType.JSON)
            .body(connectionData)
            .put("/api/v1/connections")
            .then()
            //JiraUnavailableException -> @ResponseStatus(BAD_GATEWAY) - the client must still be told something
            //went wrong, even though the change request below was created successfully
            .statusCode(502);

        //The change request must have been created in Manage - this is the bug being fixed
        verify(postRequestedFor(urlPathMatching("/manage/api/internal/change-requests")));

        //And the local connection must reflect that this request happened - i.e. the transaction was NOT rolled
        //back because of the later Jira failure. Connection#mergeMetaData(provider, true) always rebuilds #name
        //from Manage's current data ("OIDC Playground Client"), so seeing that (rather than the pre-request name
        //set above) proves connectionRepository.save(connection) inside productionReadyChangeRequests committed.
        Connection connectionFromDB = connectionRepository.findById(connection.getId()).get();
        assertEquals("OIDC Playground Client", connectionFromDB.getName());
    }
}
