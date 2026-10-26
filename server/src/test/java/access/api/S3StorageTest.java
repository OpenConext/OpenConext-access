package access.api;

import access.AbstractTest;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class S3StorageTest extends AbstractTest {

    @Autowired
    private S3Storage s3Storage;

    @Autowired
    private ObjectMapper objectMapper;


    @Test
    void uploadFile() throws IOException {
        stubFor(head(urlPathMatching("/s3-images"))
                .willReturn(aResponse()
                        .withStatus(404)
                        .withHeader("Content-Type", "application/xml")
                        .withBody("<Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>")));

        stubFor(put(urlPathMatching("/s3-images"))
                .willReturn(aResponse()
                        .withStatus(200)));

        stubFor(put(urlPathMatching("/s3-images/.*"))
                .willReturn(aResponse()
                        .withStatus(201)));

        InputStream inputStream = new ClassPathResource("/s3/squirl.jpg").getInputStream();
        byte[] byteArray = IOUtils.toByteArray(inputStream);
        String base64Encoded = Base64.getEncoder().encodeToString(byteArray);

        String url = s3Storage.uploadFile(base64Encoded);
        assertTrue(url.startsWith("http://localhost:8081/s3-images/"));
    }

    @Test
    void uploadFileWithPublicUrl() throws IOException {
        stubFor(head(urlPathMatching("/s3-images"))
                .willReturn(aResponse().withStatus(200)));
        stubFor(put(urlPathMatching("/s3-images/.*"))
                .willReturn(aResponse().withStatus(201)));

        S3Storage publicStorage = new S3Storage("http://localhost:8081", "key", "secret", "s3-images",
                "https://static.example.org/access/", objectMapper);
        byte[] byteArray = IOUtils.toByteArray(new ClassPathResource("/s3/squirl.jpg").getInputStream());

        String url = publicStorage.uploadFile(Base64.getEncoder().encodeToString(byteArray));
        assertTrue(url.startsWith("https://static.example.org/access/"));
        assertFalse(url.contains("s3-images"));
        assertFalse(url.indexOf("//", 8) >= 0);
    }

    @Test
    void uploadFileWithBlankPublicUrl() throws IOException {
        stubFor(head(urlPathMatching("/s3-images"))
                .willReturn(aResponse().withStatus(200)));
        stubFor(put(urlPathMatching("/s3-images/.*"))
                .willReturn(aResponse().withStatus(201)));

        S3Storage blankStorage = new S3Storage("http://localhost:8081", "key", "secret", "s3-images",
                "", objectMapper);
        byte[] byteArray = IOUtils.toByteArray(new ClassPathResource("/s3/squirl.jpg").getInputStream());

        String url = blankStorage.uploadFile(Base64.getEncoder().encodeToString(byteArray));
        assertTrue(url.startsWith("http://localhost:8081/s3-images/"));
    }
}
