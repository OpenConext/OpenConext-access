package access.api;

import access.model.FileUploadRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.auth.signer.AwsS3V4Signer;
import software.amazon.awssdk.core.client.config.SdkAdvancedClientOption;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.Charset;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping(value = {"/api/v1/s3"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
public class S3Controller {

    private final String bucketName;
    private final String s3URL;
    private final ObjectMapper objectMapper;
    private final S3Client s3Client;
    private final Map<String, String> metadata = Map.of("Cache-Control", "max-age=31536000, public");
    private boolean bucketExists;

    @SneakyThrows
    public S3Controller(@Value("${s3storage.url}") String s3URL,
                        @Value("${s3storage.key}") String s3AccessKey,
                        @Value("${s3storage.secret}") String s3SecretKey,
                        @Value("${s3storage.bucket}") String s3BucketName,
                        ObjectMapper objectMapper) {
        this.s3URL = s3URL;
        AwsBasicCredentials credentials =
                AwsBasicCredentials.create(s3AccessKey, s3SecretKey);

        this.s3Client = S3Client.builder()
                .endpointOverride(new URI(s3URL))
                .region(Region.US_EAST_1)
                .forcePathStyle(true)
                .overrideConfiguration(c -> {
                    c.putAdvancedOption(SdkAdvancedClientOption.SIGNER,
                            AwsS3V4Signer.create());
                })
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
        this.bucketName = s3BucketName;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@org.springframework.web.bind.annotation.RequestBody FileUploadRequest request) {
        byte[] decodedBytes = Base64.getDecoder().decode(request.getContent());

        if (!bucketExists) {
            createBucket(s3Client);
        }

        ByteArrayInputStream inputStream = new ByteArrayInputStream(decodedBytes);
        String uuid = UUID.randomUUID().toString();
        s3Client.putObject(PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(uuid)
                        .contentType("image/jpeg")
                        .metadata(metadata)
                        .build(),
                RequestBody.fromInputStream(inputStream, inputStream.available()));

        String imageUrl = String.format("%s/%s/%s", s3URL, bucketName, uuid);
        return ResponseEntity.ok(Map.of("url", imageUrl));
    }


    private void createBucket(S3Client s3Client) {
        HeadBucketRequest headBucketRequest = HeadBucketRequest.builder()
                .bucket(bucketName)
                .build();
        try {
            s3Client.headBucket(headBucketRequest);
            bucketExists = true;
        } catch (NoSuchBucketException e) {
            s3Client.createBucket(CreateBucketRequest.builder()
                    .bucket(bucketName)
                    .build());
            PutBucketPolicyRequest putBucketPolicyRequest = PutBucketPolicyRequest
                    .builder()
                    .bucket(bucketName)
                    .policy(getPublicBucketPolicy(bucketName))
                    .build();
            s3Client.putBucketPolicy(putBucketPolicyRequest);
        }
    }

    @SneakyThrows
    private String getPublicBucketPolicy(String bucketName) {
        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
                "Version", "2012-10-17",
                "Statement", List.of(Map.of(
                        "Effect", "Allow",
                        "Principal", Map.of("AWS", "*"),
                        "Action", "s3:GetObject",
                        "Resource", String.format("arn:aws:s3:::%s/*", bucketName)
                ))
        ));
    }


}
