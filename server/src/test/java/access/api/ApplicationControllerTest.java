package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.Contact;
import access.manage.MetaData;
import access.model.Application;
import access.model.Connection;
import access.model.ConnectionStatus;
import access.model.EntityType;
import access.model.ImportEntityRequest;
import access.model.MigrateApplicationRequest;
import access.model.NameExistsRequest;
import access.model.Organization;
import access.model.State;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;

import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings({"unchecked", "unsafe"})
class ApplicationControllerTest extends AbstractTest {

    @Test
    void create() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        MetaData metaData = new MetaData(
                "https://engine.test",
                "EngineBlock",
                List.of("https://engine.test.surfconext.nl/authentication/sp/consume-assertion"),
                List.of(new Contact("technical", "John", "Doe", "jdoe@example.com")),
                "EngineBlock");

        Map<String, Object> metaDataMap = super.objectMapper.convertValue(metaData, new TypeReference<>() {
        });
        Application application = new Application("New App", organization, "System", metaDataMap);
        //Otherwise rest-assured does not deserialize the Organization
        Map<String, Object> applicationData = objectMapper.convertValue(application, new TypeReference<>() {
        });
        applicationData.put("organization", Map.of("id", organization.getId()));

        Application savedApplication = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(applicationData)
                .post("/api/v1/applications")
                .as(Application.class);

        Application applicationFromDB = applicationRepository.findById(savedApplication.getId()).get();
        assertEquals(application.getName(), applicationFromDB.getName());
        assertEquals(metaDataMap, applicationFromDB.getMetaData());
    }

    @Test
    void createDoesNotHijackExistingApplicationViaClientSuppliedId() {
        //Security regression test (AUDIT.md #2 - Critical): a client-supplied id on create() must never let
        //save() merge() into (i.e. overwrite/steal) an application belonging to a different organization
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Application victim = applicationRepository.findById(seedIdentifiers.get(NITRO_MAP)).get();
        String victimOriginalName = victim.getName();
        Long victimOriginalOrganizationId = victim.getOrganization().getId();
        assertNotEquals(shareLogics.getId(), victimOriginalOrganizationId, "test setup: victim must belong to a different organization");

        Map<String, Object> applicationData = objectMapper.convertValue(
                new Application("Hijacked", shareLogics, "attacker", Map.of()), new TypeReference<>() {
                });
        applicationData.put("id", victim.getId());
        applicationData.put("organization", Map.of("id", shareLogics.getId()));

        Application savedApplication = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(applicationData)
                .post("/api/v1/applications")
                .as(Application.class);

        //A new row must have been inserted - never the victim's id
        assertNotEquals(victim.getId(), savedApplication.getId());

        Application victimAfter = applicationRepository.findById(victim.getId()).get();
        assertEquals(victimOriginalName, victimAfter.getName());
        assertEquals(victimOriginalOrganizationId, victimAfter.getOrganization().getId());
    }

    @Test
    void nameExists() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application buddyCheck = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        Long organizationId = buddyCheck.getOrganization().getId();

        //An existing application name in the same organization is taken
        NameExistsRequest duplicate = new NameExistsRequest(BUDDY_CHECK, organizationId, null);
        Boolean exists = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(duplicate)
                .post("/api/v1/applications/name-exists")
                .as(Boolean.class);
        assertTrue(exists);

        //The application itself is excluded from the check, so its own name is not a duplicate
        NameExistsRequest excludingSelf = new NameExistsRequest(BUDDY_CHECK, organizationId, buddyCheck.getId());
        exists = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(excludingSelf)
                .post("/api/v1/applications/name-exists")
                .as(Boolean.class);
        assertFalse(exists);

        //A name that is not used yet in the organization is not a duplicate
        NameExistsRequest unique = new NameExistsRequest("Some new unique application name", organizationId, null);
        exists = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(unique)
                .post("/api/v1/applications/name-exists")
                .as(Boolean.class);
        assertFalse(exists);
    }

    @Test
    void createNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Application application = new Application("New App", organization, "System", Map.of());

        //Otherwise rest-assured does not deserialize the Organization
        Map<String, Object> applicationData = objectMapper.convertValue(application, new TypeReference<>() {
        });
        applicationData.put("organization", Map.of("id", organization.getId()));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(applicationData)
                .post("/api/v1/applications")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @SneakyThrows
    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        //A find application needs stubbing for getProvider because of syncing connections
        String provider = IOUtils.toString(new ClassPathResource("/manage/playground_rp.json").getInputStream(), Charset.defaultCharset());
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/oidc10_rp/" + MANAGE_IDENTIFIER)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(provider)));
        super.stubForGetChangeRequests(getChangeRequests());
        Map<String, Object> application = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", seedIdentifiers.get(BUDDY_CHECK))
                .get("/api/v1/applications/{applicationId}")
                .as(new TypeRef<>() {
                });

        assertEquals(BUDDY_CHECK, application.get("name"));
        List connections = (List) application.get("connections");
        assertEquals(2, connections.size());
        Map<String, Object> o = (Map<String, Object>) connections.stream()
                .filter(connection -> ((Map<String, Object>) connection).get("status").equals(ConnectionStatus.PROD_READY.name()))
                .findFirst().get();
        assertEquals(2, ((List) o.get("changeRequests")).size());
    }

    @SneakyThrows
    @Test
    void findPendingProdConnectionWithoutProductionChangeRequestIsCompleted() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        stubForPendingProdProvider();
        //No prodaccepted change request pending in Manage means the production request was rejected / withdrawn
        super.stubForGetChangeRequests(List.of());

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", seedIdentifiers.get(BUDDY_CHECK))
                .get("/api/v1/applications/{applicationId}")
                .then()
                .statusCode(HttpStatus.OK.value());

        Connection connectionFromDB = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        assertEquals(ConnectionStatus.COMPLETE, connectionFromDB.getStatus());
        assertEquals(State.testaccepted, connectionFromDB.getState());
    }

    @SneakyThrows
    @Test
    void findPendingProdConnectionWithProductionChangeRequestStaysPending() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        stubForPendingProdProvider();
        //A pending prodaccepted change request means the production request is still awaiting approval in Manage
        Map<String, Object> pendingProductionChangeRequest = Map.of(
                "pathUpdates", Map.of("state", State.prodaccepted.name())
        );
        super.stubForGetChangeRequests(List.of(pendingProductionChangeRequest));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", seedIdentifiers.get(BUDDY_CHECK))
                .get("/api/v1/applications/{applicationId}")
                .then()
                .statusCode(HttpStatus.OK.value());

        Connection connectionFromDB = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        assertEquals(ConnectionStatus.PENDING_PROD, connectionFromDB.getStatus());
    }

    @SneakyThrows
    @SuppressWarnings("unchecked")
    private void stubForPendingProdProvider() {
        //Stub a provider whose Manage state is not (yet) prodaccepted, so the connection is not
        //auto-promoted to PROD_READY and remains PENDING_PROD, exercising the new business logic
        String provider = IOUtils.toString(new ClassPathResource("/manage/playground_rp.json").getInputStream(), Charset.defaultCharset());
        Map<String, Object> providerMap = objectMapper.readValue(provider, Map.class);
        ((Map<String, Object>) providerMap.get("data")).put("state", "testaccepted");
        String body = objectMapper.writeValueAsString(providerMap);
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/oidc10_rp/" + MANAGE_IDENTIFIER)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
    }

    @Test
    void update() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        application.setName("Changed");
        Organization organization = application.getOrganization();
        //Otherwise rest-assured does not deserialize the Organization
        Map<String, Object> applicationData = objectMapper.convertValue(application, new TypeReference<>() {
        });
        applicationData.put("organization", Map.of("id", organization.getId()));

        Application savedApplication = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(applicationData)
                .put("/api/v1/applications")
                .as(Application.class);

        Application applicationFromDB = applicationRepository.findById(savedApplication.getId()).get();
        assertEquals(application.getName(), applicationFromDB.getName());
    }

    @Test
    void updateMetaDataChanged() {
        //Application updates now require at least MEMBER (AUDIT.md follow-up: GUEST is view-only) -
        //EXTERNAL_USER_SUB is only a GUEST of SHARE_LOGICS, so use MANAGE_SUB as elsewhere in this test class
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        application.getMetaData().put("information", Map.of("descriptionEN", "Changed"));
        Organization organization = application.getOrganization();
        //Otherwise rest-assured does not deserialize the Organization
        Map<String, Object> applicationData = objectMapper.convertValue(application, new TypeReference<>() {
        });
        applicationData.put("organization", Map.of("id", organization.getId()));

        //The details of the connections are retrieved
        super.stubForGetProvider(EntityType.oidc10_rp, MANAGE_IDENTIFIER, "5");
        Connection connectionProd = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        connectionProd.setManageIdentifier("5");
        super.stubForSaveProvider(connectionProd);
        Connection connectionTest = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_TEST)).get();
        super.stubForSaveProvider(connectionTest);
        super.stubForGetProvider(EntityType.saml20_idp, "7");

        Application savedApplication = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(applicationData)
                .put("/api/v1/applications")
                .as(new TypeRef<>() {
                });
        Application applicationFromDB = applicationRepository.findById(savedApplication.getId()).get();
        assertEquals(application.getMetaData(), applicationFromDB.getMetaData());

    }

    @Test
    void delete() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

        super.stubForDeleteProvider(EntityType.oidc10_rp, MANAGE_IDENTIFIER);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .delete("/api/v1/applications/{applicationId}")
                .then()
                .statusCode(204);

        Optional<Application> optionalApplication = applicationRepository.findById(applicationId);
        assertFalse(optionalApplication.isPresent());
    }

    @Test
    void findAll() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        List<Map<String, Object>> applications = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/applications/all")
                .as(new TypeRef<>() {
                });

        assertEquals(3, applications.size());
    }

    @Test
    void allLightByOrganization() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Long organizationId = seedIdentifiers.get(SHARE_LOGICS);
        List<Map<String, Object>> applications = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organizationId)
                .get("/api/v1/applications/all/light/{organizationId}")
                .as(new TypeRef<>() {
                });

        assertEquals(2, applications.size());
    }

    @Test
    void identityProvidersByAllowedConnections() throws JacksonException {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

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
                .pathParam("applicationId", applicationId)
                .get("/api/v1/applications/identity-providers-allowed-connections/{applicationId}")
                .as(new TypeRef<>() {
                });

        assertEquals(2, providers.size());
    }

    @Test
    void identityProvidersByAllowedConnectionsTestConnection() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Long applicationId = seedIdentifiers.get(NITRO_MAP);
        List<Map<String, Object>> providers = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .get("/api/v1/applications/identity-providers-allowed-connections/{applicationId}")
                .as(new TypeRef<>() {
                });

        assertEquals(0, providers.size());
    }

    @Test
    void migrate() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Application applicationBuddyCheck = applicationRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK)).get();
        assertEquals(SHARE_LOGICS, applicationBuddyCheck.getOrganization().getName());

        MigrateApplicationRequest migrateApplicationRequest = new MigrateApplicationRequest(
                seedIdentifiers.get(BUDDY_CHECK),
                seedIdentifiers.get(FAR_WIND)
        );
        stubForGetProvider(EntityType.oidc10_rp, MANAGE_IDENTIFIER, "5");
        Connection connectionProd = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        connectionProd.setManageIdentifier("5");
        super.stubForSaveProvider(connectionProd);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(migrateApplicationRequest)
                .put("/api/v1/applications/migrate")
                .then()
                .statusCode(HttpStatus.OK.value());

        applicationBuddyCheck = applicationRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK)).get();
        assertEquals(FAR_WIND, applicationBuddyCheck.getOrganization().getName());

    }

    @Test
    void migrateWithIdentityProviderChange() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Application applicationBuddyCheck = applicationRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK)).get();
        assertEquals(SHARE_LOGICS, applicationBuddyCheck.getOrganization().getName());

        Organization newOrganization = organizationRepository.findById(seedIdentifiers.get(FAR_WIND)).get();
        newOrganization.setManageIdentifier("7");
        organizationRepository.save(newOrganization);
        //Will be called to migrate the coin:institution_guid
        super.stubForGetProvider(EntityType.saml20_idp, "7");

        MigrateApplicationRequest migrateApplicationRequest = new MigrateApplicationRequest(
                seedIdentifiers.get(BUDDY_CHECK),
                seedIdentifiers.get(FAR_WIND)
        );
        stubForGetProvider(EntityType.oidc10_rp, MANAGE_IDENTIFIER, "5");
        Connection connectionProd = connectionRepository.findById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        connectionProd.setManageIdentifier("5");
        super.stubForSaveProvider(connectionProd);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(migrateApplicationRequest)
                .put("/api/v1/applications/migrate")
                .then()
                .statusCode(HttpStatus.OK.value());

        applicationBuddyCheck = applicationRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK)).get();
        assertEquals(FAR_WIND, applicationBuddyCheck.getOrganization().getName());

    }

    @Test
    void importEntity() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.oidc10_rp, "10");
        ImportEntityRequest importEntityRequest = new ImportEntityRequest(
                seedIdentifiers.get(FAR_WIND),
                null,
                provider
        );
        super.stubForSaveProvider(connection(EntityType.oidc10_rp, "5"));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(importEntityRequest)
                .post("/api/v1/applications/import")
                .then()
                .statusCode(HttpStatus.OK.value());

        Organization organization = organizationRepository.findApplicationsDetailsOrganizationById(seedIdentifiers.get(FAR_WIND)).get();
        //See src/main/resources/manage/oidc10_rp.json id="10"
        Application application = organization.getApplications().stream()
                .filter(app -> app.getName().equals("OIDC Playground Client")).findFirst().get();
        assertEquals(1, application.getConnections().size());
    }

    @Test
    void importEntityExistingApplication() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        Map<String, Object> provider = localManage.providerByManageIdentifier(EntityType.oidc10_rp, "10");
        ImportEntityRequest importEntityRequest = new ImportEntityRequest(
                seedIdentifiers.get(FAR_WIND),
                seedIdentifiers.get(NITRO_MAP),
                provider
        );
        super.stubForSaveProvider(connection(EntityType.oidc10_rp, "10"));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(importEntityRequest)
                .post("/api/v1/applications/import")
                .then()
                .statusCode(HttpStatus.OK.value());
        Application application = applicationRepository.findDetailsById(seedIdentifiers.get(NITRO_MAP)).get();
        assertEquals(1, application.getConnections().size());
    }
}
