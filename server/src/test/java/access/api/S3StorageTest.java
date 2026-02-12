package access.api;

import access.AbstractTest;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertTrue;

class S3StorageTest extends AbstractTest {

    @Autowired
    private S3Storage s3Storage;


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
}