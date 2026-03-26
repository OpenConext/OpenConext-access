package access.api;

import access.AbstractMailTest;
import access.AccessCookieFilter;
import access.mail.MimeMessageParser;
import access.manage.ChangeRequest;
import access.manage.PathUpdateType;
import access.manage.RequestType;
import access.model.*;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static access.manage.ManageData.getData;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("unchecked")
class IdentityProviderControllerTest extends AbstractMailTest {

    @Test
    void memberConnectionRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .as(new TypeRef<>() {
                });

        String htmlContent = super.mailMessage().getHtmlContent();
        assertTrue(htmlContent.contains("has requested to connect service Storage EN to your organization ShareLogics"));
    }

    @SneakyThrows
    @Test
    void memberConnectionRequestSuperUserRecipientFallback() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        // Delete all admins to force the fallback to superusers
        jdbcTemplate.update(
                "DELETE FROM organization_memberships WHERE organization_id = ? AND authority = ?",
                organization.getId(),
                Authority.ADMIN.name()
        );
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .as(new TypeRef<>() {
                });

        MimeMessageParser messageParser = super.mailMessage();
        List<String> recipients = messageParser.getTo().stream().map(address -> address.toString()).sorted().toList();
        //select email from users where super_user = 1
        assertEquals(List.of("david.doe@example.com", "ex.doe@eduid.nl", "mos.doe@example.com"), recipients);
        String htmlContent = messageParser.getHtmlContent();
        assertTrue(htmlContent.contains("has requested to connect service Storage EN to your organization ShareLogics"));
    }

    @Test
    void memberConnectionRequestNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(LOGISTICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .then()
                .statusCode(409);
    }

    @Test
    void memberConnectionRequestNotFound() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                "nope",
                "Connect..."
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .then()
                .statusCode(404);
    }

    @SneakyThrows
    @Test
    void adminConnectionRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        /// Stub for POST new change request
        Map<String, String> manageResponse = Map.of("id", "1");
        stubFor(post(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));

        Map<String, Object> res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .as(new TypeRef<>() {
                });
        assertNotNull(res.get("jiraKey"));
    }

    @SneakyThrows
    @Test
    void adminConnectionRequestNoInteractionWithEmail() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "5",
                EntityType.oidc10_rp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval - see src/main/resources/manage/*.json
        super.stubForGetProvider(EntityType.oidc10_rp, "5", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        /// Stub for POST connectWithoutInteraction
        stubFor(put(urlPathMatching("/manage/api/internal/connectWithoutInteraction")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withStatus(201)));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .as(new TypeRef<>() {
                });

        MimeMessageParser messageParser = super.mailMessage();
        List<String> recipients = messageParser.getTo().stream().map(address -> address.toString()).sorted().toList();
        assertEquals(List.of("support@cal.com"), recipients);
        String htmlContent = messageParser.getHtmlContent();
        assertTrue(htmlContent.contains("Mary Doe from Institution"));
        assertTrue(htmlContent.contains("Mock IdP EN"));
        assertTrue(htmlContent.contains("Calendar EN"));
    }

    @SneakyThrows
    @Test
    void adminConnectionRequestNoInteractionWithoutEmail() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "6",
                EntityType.oidc10_rp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval - see src/main/resources/manage/*.json
        super.stubForGetProvider(EntityType.oidc10_rp, "6", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        /// Stub for POST connectWithoutInteraction
        stubFor(put(urlPathMatching("/manage/api/internal/connectWithoutInteraction")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withStatus(201)));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/connect")
                .as(new TypeRef<>() {
                });

        confirmNoMailMessages();
    }

    @SneakyThrows
    @Test
    void adminDisconnectionRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        /// Stub for POST new change request
        Map<String, String> manageResponse = Map.of("id", "1");
        stubFor(post(urlPathMatching("/manage/api/internal/change-requests")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(manageResponse))));

        Map<String, Object> res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/disconnect")
                .as(new TypeRef<>() {
                });
        assertNotNull(res.get("jiraKey"));
    }

    @SneakyThrows
    @Test
    void cancelConnectionRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        Map<String, Object> provider = super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);
        /// Stub for GET all change requests
        ChangeRequest changeRequest = new ChangeRequest(
                UUID.randomUUID().toString(),
                EntityType.saml20_idp,
                Map.of("allowedEntities", Map.of("name", getData(provider).get("entityid"))),
                false,
                PathUpdateType.ADDITION,
                RequestType.LinkRequest
        );
        super.stubForGetChangeRequests(List.of(objectMapper.convertValue(changeRequest, Map.class)));

        stubFor(put(urlPathMatching("/manage/api/internal/change-requests/reject"))
                .willReturn(aResponse().withStatus(200)));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/cancel-connection-request")
                .then()
                .statusCode(HttpStatus.OK.value());
    }

    @SneakyThrows
    @Test
    void cancelDisconnectionRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        ConnectionRequest connectionRequest = new ConnectionRequest(
                "3",
                EntityType.saml20_sp,
                organization.getManageIdentifier(),
                "Connect..."
        );
        //Need to stub manage calls for SP and IdP retrieval
        Map<String, Object> provider = super.stubForGetProvider(EntityType.saml20_sp, "3", Environment.PROD);
        super.stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);
        /// Stub for GET all change requests
        ChangeRequest changeRequest = new ChangeRequest(
                UUID.randomUUID().toString(),
                EntityType.saml20_idp,
                Map.of("allowedEntities", Map.of("name", getData(provider).get("entityid"))),
                false,
                PathUpdateType.REMOVAL,
                RequestType.UnlinkRequest
        );
        super.stubForGetChangeRequests(List.of(objectMapper.convertValue(changeRequest, Map.class)));

        stubFor(put(urlPathMatching("/manage/api/internal/change-requests/reject"))
                .willReturn(aResponse().withStatus(200)));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(connectionRequest)
                .put("/api/v1/idp/cancel-disconnection-request")
                .then()
                .statusCode(HttpStatus.OK.value());
    }
}