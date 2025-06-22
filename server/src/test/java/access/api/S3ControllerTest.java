package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.FileUploadRequest;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertTrue;

//@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Testcontainers
class S3ControllerTest extends AbstractTest {

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
        // Stub the PUT request to S3
        stubFor(put(urlPathMatching("/s3-images/.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("ETag", "\"mock-etag\"")));

        InputStream inputStream = new ClassPathResource("/s3/squirl.jpg").getInputStream();
        byte[] byteArray = IOUtils.toByteArray(inputStream);
        String base64Encoded = Base64.getEncoder().encodeToString(byteArray);

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Map<String, String> body = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(new FileUploadRequest(base64Encoded))
                .post("/api/v1/s3/upload")
                .as(new TypeRef<>() {
                });
        System.out.println("XXXXXX");
        System.out.println(body);
        String url = body.get("url");
        assertTrue(url.startsWith("http://localhost"));
        assertTrue(url.contains("s3-images"));
    }

    @Override
    protected boolean seedDatabase() {
        return false;
    }
}