package access.api;

import access.model.FileUploadRequest;
import com.adobe.testing.s3mock.junit5.S3MockExtension;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

//Don't
class S3ControllerTest {

    @RegisterExtension
    public static S3MockExtension S3_MOCK = S3MockExtension.builder()
            .withHttpPort(9000)
            .withSecureConnection(false)
            .build();


    @Test
    void uploadFile() throws IOException {
        InputStream inputStream = new ClassPathResource("/s3/squirl.jpg").getInputStream();
        byte[] byteArray = IOUtils.toByteArray(inputStream);
        String base64Encoded = Base64.getEncoder().encodeToString(byteArray);

        S3Controller s3Controller = new S3Controller(
                "http://127.0.0.1:9000",
                "minioadmin",
                "minioadmin",
                "s3-images",
                new ObjectMapper()
        );
        Map<String, String> body = s3Controller.uploadFile(new FileUploadRequest(base64Encoded)).getBody();
        String url = body.get("utl");
        assertTrue(url.startsWith("http://127.0.0.1:9000/s3-images"));
    }
}