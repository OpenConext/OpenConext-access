package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.Application;
import access.model.Organization;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.http.ContentType;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
class ApplicationS3ControllerTest extends AbstractTest {

    @Container
    public static MinIOContainer minioContainer = new MinIOContainer(
            "minio/minio:RELEASE.2025-05-24T17-08-30Z"
    )
            .withUserName("minioadmin")
            .withPassword("minioadmin")
            .withReuse(true); // Reuse container across tests for faster execution

    @DynamicPropertySource
    static void setMinioProperties(DynamicPropertyRegistry registry) {
        registry.add("s3storage.url", minioContainer::getS3URL);
    }

    @Test
    void uploadFile() throws IOException {
        InputStream inputStream = new ClassPathResource("/s3/squirl.jpg").getInputStream();
        byte[] byteArray = IOUtils.toByteArray(inputStream);
        String base64Encoded = Base64.getEncoder().encodeToString(byteArray);

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Application application = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        application.setName("Changed");
        application.setLogoUrl(base64Encoded);
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
        String url = applicationFromDB.getLogoUrl();
        assertTrue(url.startsWith("http://localhost"));
        assertTrue(url.contains("s3-images"));
    }

}