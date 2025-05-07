package access;

import access.config.HashGenerator;
import access.manage.EntityType;
import access.manage.LocalManage;
import access.manage.Manage;
import access.model.User;
import access.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import io.restassured.RestAssured;
import io.restassured.common.mapper.TypeRef;
import io.restassured.config.ObjectMapperConfig;
import io.restassured.config.RestAssuredConfig;
import io.restassured.filter.cookie.CookieFilter;
import io.restassured.http.ContentType;
import io.restassured.http.Headers;
import lombok.SneakyThrows;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.text.SimpleDateFormat;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;


@ExtendWith(SpringExtension.class)
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "oidcng.introspect-url=http://localhost:8081/introspect",
                "config.past-date-allowed=False",
                "spring.security.oauth2.client.provider.oidcng.authorization-uri=http://localhost:8081/authorization",
                "spring.security.oauth2.client.provider.oidcng.token-uri=http://localhost:8081/token",
                "spring.security.oauth2.client.provider.oidcng.user-info-uri=http://localhost:8081/user-info",
                "spring.security.oauth2.client.provider.oidcng.jwk-set-uri=http://localhost:8081/jwk-set",
                "manage.url: http://localhost:8081",
                "myconext.uri: http://localhost:8081/myconext/api/invite/provision-eduid",
                "manage.enabled: true",
                "spring.jpa.properties.hibernate.format_sql=false",
                "spring.jpa.show-sql=false"
        })
@SuppressWarnings("unchecked")
public abstract class AbstractTest {

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    public static final String SUPER_SUB = "urn:collab:person:example.com:super";
    public static final String MANAGE_SUB = "urn:collab:person:example.com:manager";
    public static final String INSTITUTION_ADMIN_SUB = "urn:collab:person:example.com:institution_admin";
    public static final String INVITER_SUB = "urn:collab:person:example.com:inviter";
    public static final String INVITER_WIKI_SUB = "urn:collab:person:example.com:inviter_wiki_sub";
    public static final String GUEST_SUB = "urn:collab:person:example.com:guest";
    public static final String GRAPH_INVITATION_HASH = "graph_invitation_hash";
    public static final String INSTITUTION_ADMIN_INVITATION_HASH = "institution_admin_invitation_hash";
    public static final String ORGANISATION_GUID = "ad93daef-0911-e511-80d0-005056956c1a";
    public static final String API_TOKEN_HASH = HashGenerator.generateToken();
    public static final String API_TOKEN_SUPER_USER_HASH = HashGenerator.generateToken();

    @Value("${manage.staticManageDirectory}")
    private String staticManageDirectory;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected Manage manage;

    protected LocalManage localManage;

    @RegisterExtension
    WireMockExtension mockServer = new WireMockExtension(8081);

    @LocalServerPort
    protected int port;

    @BeforeAll
    protected static void beforeAll() {
        RestAssured.config = RestAssuredConfig.config()
                .objectMapperConfig(new ObjectMapperConfig().jackson2ObjectMapperFactory(
                        new ConfigurableJackson2ObjectMapperFactory()));
    }

    @BeforeEach
    protected void beforeEach() throws Exception {
        RestAssured.port = port;
        if (seedDatabase()) {
            this.doSeed();
        }
        if (this.localManage == null) {
            this.localManage = new LocalManage(objectMapper, staticManageDirectory);
        }
    }

    protected boolean seedDatabase() {
        return true;
    }

    protected String opaqueAccessToken(String sub, String responseJsonFileName, String email, String... scopes) throws IOException {
        List<String> scopeList = new ArrayList<>(Arrays.asList(scopes));
        scopeList.add("openid");

        Map<String, Object> introspectResult = objectMapper.readValue(new ClassPathResource(responseJsonFileName).getInputStream(), new TypeReference<>() {
        });
        introspectResult.put("sub", sub);
        introspectResult.put("eduperson_principal_name", email);
        introspectResult.put("email", email);
        introspectResult.put("given_name", "John");
        introspectResult.put("family_name", "Doe");

        introspectResult.put("scope", String.join(" ", scopeList));
        introspectResult.put("exp", (System.currentTimeMillis() / 1000) + 60);
        introspectResult.put("updated_at", System.currentTimeMillis() / 1000);
        String introspectResultWithScope = objectMapper.writeValueAsString(introspectResult);

        stubFor(post(urlPathMatching("/introspect")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(introspectResultWithScope)));
        return UUID.randomUUID().toString();
    }

    protected AccessCookieFilter openIDConnectFlow(String path, String sub) throws Exception {
        return this.openIDConnectFlow(path, sub, s -> {
        }, m -> m);
    }

    protected AccessCookieFilter openIDConnectFlow(String path,
                                                   String sub,
                                                   UnaryOperator<Map<String, Object>> userInfoEnhancer) throws Exception {
        return this.openIDConnectFlow(path, sub, s -> {
        }, userInfoEnhancer);
    }

    protected AccessCookieFilter openIDConnectFlow(String path, String sub,
                                                   Consumer<String> authorizationConsumer,
                                                   UnaryOperator<Map<String, Object>> userInfoEnhancer) throws Exception {
        CookieFilter cookieFilter = new CookieFilter();
        Headers headers = given()
                .redirects()
                .follow(false)
                .when()
                .filter(cookieFilter)
                .get(path)
                .headers();
        String location = headers.getValue("Location");
        assertEquals("http://localhost:" + this.port + "/oauth2/authorization/oidcng", location);

        headers = given()
                .redirects()
                .follow(false)
                .when()
                .filter(cookieFilter)
                .get(location)
                .headers();
        location = headers.getValue("Location");
        assertTrue(location.startsWith("http://localhost:8081/authorization?"));

        authorizationConsumer.accept(location);

        MultiValueMap<String, String> queryParams = UriComponentsBuilder.fromUriString(location).build().getQueryParams();
        String redirectUri = queryParams.getFirst("redirect_uri");
        //The state and nonce are url encoded
        String state = URLDecoder.decode(queryParams.getFirst("state"), StandardCharsets.UTF_8);
        String nonce = URLDecoder.decode(queryParams.getFirst("nonce"), StandardCharsets.UTF_8);

        String keyId = String.format("key_%s", new SimpleDateFormat("yyyy_MM_dd_HH_mm_ss_SSS").format(new Date()));
        RSAKey rsaKey = generateRsaKey(keyId);
        String publicKeysJson = new JWKSet(rsaKey.toPublicJWK()).toJSONObject().toString();
        stubFor(get(urlPathMatching("/jwk-set")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(publicKeysJson)));

        Map<String, Object> userInfo = objectMapper.readValue(new ClassPathResource("user-info.json").getInputStream(), new TypeReference<>() {
        });
        userInfo.put("sub", StringUtils.hasText(sub) ? sub : "sub");
        userInfo.put("email", sub);
        userInfo.put("eduperson_principal_name", sub);
        userInfo = userInfoEnhancer.apply(userInfo);

        SignedJWT signedJWT = getSignedJWT(keyId, redirectUri, rsaKey, sub, nonce, state, userInfo);
        String serialized = signedJWT.serialize();
        Map<String, Object> tokenResult = Map.of(
                "access_token", serialized,
                "expires_in", 864000,
                "id_token", serialized,
                "refresh_token", serialized,
                "token_type", "Bearer"
        );
        String validTokenResult = objectMapper.writeValueAsString(tokenResult);
        stubFor(post(urlPathMatching("/token")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(validTokenResult)));

        String userInfoResult = objectMapper.writeValueAsString(userInfo);
        stubFor(get(urlPathMatching("/user-info")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(userInfoResult)));

        Map<String, String> body = new HashMap<>();
        body.put("code", UUID.randomUUID().toString());
        body.put("state", state);

        headers = given()
                .redirects()
                .follow(false)
                .filter(cookieFilter)
                .when()
                .contentType(ContentType.URLENC)
                .formParams(body)
                .post(redirectUri)
                .headers();
        location = headers.getValue("Location");
        //Refreshing the CSRF token after authentication success and logout success is required
        Map<String, String> map = given()
                .when()
                .filter(cookieFilter)
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/csrf")
                .then()
                .extract()
                .as(new TypeRef<>() {
                });

        CsrfToken csrfToken = new DefaultCsrfToken(map.get("headerName"), map.get("parameterName"), map.get("token"));
        return new AccessCookieFilter(cookieFilter, location, csrfToken);
    }


    protected RSAKey generateRsaKey(String keyID) throws NoSuchProviderException, NoSuchAlgorithmException {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA", "BC");
        kpg.initialize(2048);
        KeyPair keyPair = kpg.generateKeyPair();
        RSAPrivateKey privateKey = (RSAPrivateKey) keyPair.getPrivate();
        RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();

        return new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .algorithm(JWSAlgorithm.RS256)
                .keyUse(KeyUse.SIGNATURE)
                .keyID(keyID)
                .build();
    }

    protected SignedJWT getSignedJWT(String keyID, String redirectURI, RSAKey rsaKey, String sub, String nonce, String state, Map<String, Object> userInfo) throws Exception {
        JWTClaimsSet claimsSet = getJwtClaimsSet("http://localhost:8081", sub, redirectURI, nonce, state, userInfo);
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256).type(JOSEObjectType.JWT).keyID(keyID).build();
        SignedJWT signedJWT = new SignedJWT(header, claimsSet);
        JWSSigner jswsSigner = new RSASSASigner(rsaKey);
        signedJWT.sign(jswsSigner);
        return signedJWT;
    }

    protected JWTClaimsSet getJwtClaimsSet(String clientId, String sub, String redirectURI, String nonce, String state, Map<String, Object> userInfo) {
        Instant instant = Clock.systemDefaultZone().instant();

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .audience("playground_client")
                .expirationTime(Date.from(instant.plus(3600, ChronoUnit.SECONDS)))
                .jwtID(UUID.randomUUID().toString())
                .issuer(clientId)
                .issueTime(Date.from(instant))
                .subject(StringUtils.hasText(sub) ? sub : "sub")
                .notBeforeTime(new Date(System.currentTimeMillis()))
                .claim("redirect_uri", redirectURI)
                .claim("eduperson_principal_name", sub)
                .claim("email", sub)
                .claim("given_name", userInfo.get("given_name"))
                .claim("family_name", userInfo.get("family_name"))
                .claim("nonce", nonce)
                .claim("state", state);
        return builder.build();
    }

    @SneakyThrows
    private String writeValueAsString(List<Map<String, Object>> providers) {
        return objectMapper.writeValueAsString(providers);
    }

    private void doSeed() {
        this.userRepository.deleteAllInBatch();

        User superUser =
                new User(true, SUPER_SUB, SUPER_SUB, "example.com", "David", "Doe", "david.doe@example.com");
        User institutionAdmin =
                new User(false, INSTITUTION_ADMIN_SUB, INSTITUTION_ADMIN_SUB, "example.com", "Carl", "Doe", "carl.doe@example.com");

        User manager =
                new User(false, MANAGE_SUB, MANAGE_SUB, "example.com", "Mary", "Doe", "mary.doe@example.com");
        User inviter =
                new User(false, INVITER_SUB, INVITER_SUB, "example.com", "Paul", "Doe", "paul.doe@example.com");
        User wikiInviter =
                new User(false, INVITER_WIKI_SUB, INVITER_WIKI_SUB, "example.com", "James", "Doe", "james.doe@example.com");
        User guest =
                new User(false, GUEST_SUB, GUEST_SUB, "example.com", "Ann", "Doe", "ann.doe@example.com");
        guest.setEduId(UUID.randomUUID().toString());
        doSave(this.userRepository, superUser, institutionAdmin, manager, inviter, wikiInviter, guest);

    }

    @SafeVarargs
    private <M> void doSave(JpaRepository<M, Long> repository, M... entities) {
        repository.saveAll(Arrays.asList(entities));
    }


}
