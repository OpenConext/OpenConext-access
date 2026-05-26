package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.*;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@TestPropertySource(properties = "config.demo-seed-enabled=true")
class SystemControllerDemoSeedTest extends AbstractTest {

    @Test
    void demoSeed() {
        // Both connections are new (no manageIdentifier), so saveProvider issues a POST
        stubFor(post(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"id\":\"demo-manage-id\",\"version\":0}")
                        .withStatus(200)));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Map<String, Object> result = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .post("/api/v1/system/seed/demo")
                .as(new TypeRef<>() {
                });

        assertEquals("ok", result.get("status"));

        // Two organizations: Dummy IdP and Commerz
        assertEquals(2, organizationRepository.findAll().size());

        // 7 users: 3 (Dummy IdP) + 3 (Commerz) + 1 Solo Doe (no membership)
        assertEquals(7, userRepository.findAll().size());

        // 3 applications: Prod App + Mock App (Dummy IdP) + ShareLogic (Commerz)
        assertEquals(3, applicationRepository.findAll().size());

        // 2 connections on Prod App: one OIDC, one SAML
        List<Connection> connections = connectionRepository.findAll();
        assertEquals(2, connections.size());

        Connection oidcConnection = connections.stream()
                .filter(c -> c.getProtocol() == EntityType.oidc10_rp)
                .findFirst()
                .orElseThrow();
        assertEquals(ConnectionStatus.PROD_READY, oidcConnection.getStatus());
        assertEquals(State.prodaccepted, oidcConnection.getState());

        Connection samlConnection = connections.stream()
                .filter(c -> c.getProtocol() == EntityType.saml20_sp)
                .findFirst()
                .orElseThrow();
        assertEquals(ConnectionStatus.PENDING_PROD, samlConnection.getStatus());

        // 1 ApplicationMembership: guest of Dummy IdP on Prod App
        assertEquals(1, applicationMembershipRepository.findAll().size());

        // 6 OrganizationMemberships: 3 for Dummy IdP + 3 for Commerz
        assertEquals(6, organizationMembershipRepository.findAll().size());

        // 1 JoinRequest from Solo Doe to Commerz
        List<JoinRequest> joinRequests = joinRequestRepository.findAll();
        assertEquals(1, joinRequests.size());
        assertEquals("sole@test.nl", joinRequests.getFirst().getUser().getEmail());

        // Manage.saveProvider was called exactly twice (once per connection)
        verify(2, postRequestedFor(urlPathMatching("/manage/api/internal/metadata")));
    }

    @Test
    void demoSeedForbiddenForNonSuperUser() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .post("/api/v1/system/seed/demo")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

}
