package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.Contact;
import access.manage.MetaData;
import access.model.Application;
import access.model.Organization;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class ApplicationControllerTest extends AbstractTest {

    @Test
    void allByOrganization() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        List<Application> applications = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", seedIdentifiers.get(SHARE_LOGICS))
                .get("/api/v1/applications/all/{organizationId}")
                .as(new TypeRef<>() {
                });
        assertEquals(1, applications.size());

        Application application = applications.getFirst();
        assertEquals(BUDDY_CHECK, application.getName());
        assertNotNull(application.getOrganization());
    }

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
        Application application = new Application("New App", organization, metaDataMap);
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
    void createNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Application application = new Application("New App", organization, Map.of());

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

    @Test
    void find() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", seedIdentifiers.get(BUDDY_CHECK))
                .get("/api/v1/applications/{applicationId}")
                .as(Application.class);

        assertEquals(BUDDY_CHECK, application.getName());
        assertEquals(2, application.getConnections().size());
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
    void delete() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

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
}
