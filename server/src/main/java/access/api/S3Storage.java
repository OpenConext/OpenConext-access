package access.api;

import tools.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.auth.signer.AwsS3V4Signer;
import software.amazon.awssdk.core.client.config.SdkAdvancedClientOption;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;


@Service
public class S3Storage {

    private final String bucketName;
    private final String s3URL;
    private final ObjectMapper objectMapper;
    private final S3Client s3Client;
    private boolean bucketExists;

    @SneakyThrows
    @SuppressWarnings("deprecation")
    public S3Storage(@Value("${s3storage.url}") String s3URL,
                     @Value("${s3storage.key}") String s3AccessKey,
                     @Value("${s3storage.secret}") String s3SecretKey,
                     @Value("${s3storage.bucket}") String s3BucketName,
                     ObjectMapper objectMapper) {
        this.s3URL = s3URL;
        AwsBasicCredentials credentials =
                AwsBasicCredentials.create(s3AccessKey, s3SecretKey);

        this.s3Client = S3Client.builder()
                .endpointOverride(new URI(s3URL))
                .region(Region.EU_CENTRAL_1)
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

    @SneakyThrows
    public String uploadFile(String content) {
        byte[] decodedBytes = Base64.getDecoder().decode(content);

        if (!bucketExists) {
            createBucket(s3Client);
        }

        ByteArrayInputStream inputStream = new ByteArrayInputStream(decodedBytes);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Thumbnails.of(inputStream)
                .size(200, 200)
                .keepAspectRatio(true)
                .toOutputStream(baos);

        inputStream = new ByteArrayInputStream(baos.toByteArray());

        String uuid = UUID.randomUUID().toString();
        s3Client.putObject(PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(uuid)
                        .contentType("image/jpeg")
                        .cacheControl("public, max-age=31536000, immutable")
                        .build(),
                RequestBody.fromInputStream(inputStream, inputStream.available()));

        return String.format("%s/%s/%s", s3URL, bucketName, uuid);
    }


    private void createBucket(S3Client s3Client) {
        HeadBucketRequest headBucketRequest = HeadBucketRequest.builder()
                .bucket(bucketName)
                .build();
        try {
            s3Client.headBucket(headBucketRequest);
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
            bucketExists = true;
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
