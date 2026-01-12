package access;

import access.config.HashGenerator;
import access.manage.ConnectionProviderConverter;
import access.manage.Contact;
import access.manage.LocalManage;
import access.model.*;
import access.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.client.MappingBuilder;
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
import io.restassured.http.Header;
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

import javax.sql.DataSource;
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

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathMatching;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;


@ExtendWith(SpringExtension.class)
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "oidcng.introspect-url=http://localhost:8081/introspect",
//                "logging.level.org.hibernate.SQL=DEBUG",
//                "logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE",
//                "spring.jpa.show-sql=true",
//                "spring.jpa.properties.hibernate.format_sql=true",
                "spring.security.oauth2.client.provider.oidcng.authorization-uri=http://localhost:8081/authorization",
                "spring.security.oauth2.client.provider.oidcng.token-uri=http://localhost:8081/token",
                "spring.security.oauth2.client.provider.oidcng.user-info-uri=http://localhost:8081/user-info",
                "spring.security.oauth2.client.provider.oidcng.jwk-set-uri=http://localhost:8081/jwk-set",
                "manage.test.url=http://localhost:8081",
                "manage.enabled=true",
                "manage.prod.url=http://localhost:8081",
                "jira.enabled=false",
                "s3storage.url=http://localhost:8081",
                "invite.enabled=true",
                //Trailing backslash for testing purposes
                "invite.url=http://localhost:8081/"
        })
@SuppressWarnings("unchecked")
public abstract class AbstractTest {


    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    //Users
    public static final String ADMIN_SUB = "urn:collab:person:example.com:admin";
    public static final String SUPER_SUB = "urn:collab:person:example.com:super";
    public static final String MANAGE_SUB = "urn:collab:person:example.com:manager";
    public static final String GUEST_SUB = "urn:collab:person:example.com:guest";
    public static final String EXTERNAL_USER_SUB = "urn:collab:person:example.com:external_user";
    public static final String MULTIPLE_ORG_SUB = "urn:collab:person:example.com:mos";
    //Organisation GUD of the mock-idp
    public static final String ORGANISATION_GUID = "ad93daef-0911-e511-80d0-005056956c1a";
    //Organizations
    public static final String SHARE_LOGICS = "ShareLogics";
    public static final String FAR_WIND = "FarWind";
    public static final String LOGISTICS = "Logistics";
    //Applications
    public static final String NITRO_MAP = "NitroMap";
    public static final String BUDDY_CHECK = "BuddyCheck";
    public static final String TECHNO = "Techno";
    //Connections
    public static final String BUDDY_CHECK_TEST = "BuddyCheck-Test";
    public static final String BUDDY_CHECK_PROD = "BuddyCheck-Prod";
    public static final String MANAGE_IDENTIFIER = "MANAGE_IDENTIFIER";
    //Invitations
    public static final String SHARE_LOGICS_INVITATION_HASH = HashGenerator.generateRandomHash();

    @Value("${manage.staticManageDirectory}")
    private String staticManageDirectory;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected JoinRequestRepository joinRequestRepository;

    @Autowired
    protected ConnectionRepository connectionRepository;

    @Autowired
    protected InvitationRepository invitationRepository;

    @Autowired
    protected OrganizationRepository organizationRepository;

    @Autowired
    protected ApplicationMembershipRepository applicationMembershipRepository;

    @Autowired
    protected ApplicationRepository applicationRepository;

    @Autowired
    protected OrganizationMembershipRepository organizationMembershipRepository;

    @Autowired
    protected DataSource dataSource;

    protected LocalManage localManage;

    protected final Map<String, Long> seedIdentifiers = new HashMap<>();

    @RegisterExtension
    static CustomWireMockExtension mockServer = new CustomWireMockExtension(8081);

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
            ConnectionProviderConverter converter = new ConnectionProviderConverter(objectMapper, State.testaccepted, State.prodaccepted);
            this.localManage = new LocalManage(converter, objectMapper, staticManageDirectory);
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

    protected UnaryOperator<Map<String, Object>> institutionalAdminEntitlementOperator(String organisationGuid) {
        return m -> {
            m.put("eduperson_entitlement",
                    List.of(
                            "urn:mace:surfnet.nl:surfnet.nl:sab:role:SURFconextverantwoordelijke",
                            "urn:mace:surfnet.nl:surfnet.nl:sab:organizationGUID:" + organisationGuid
                    ));
            return m;
        };
    }

    protected AccessCookieFilter openIDConnectFlow(String path,
                                                   String sub,
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

    protected AccessCookieFilter mockLoginFlow(String sub) {
        return mockLoginFlow(Map.of("sub", sub));
    }

    protected AccessCookieFilter mockLoginFlow(Map<String, Object> attributes) {
        CookieFilter cookieFilter = new CookieFilter();
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .filter(cookieFilter)
                .body(attributes)
                .put("/api/v1/test/login")
                .then()
                .statusCode(201);

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
        return new AccessCookieFilter(cookieFilter, null, csrfToken);
    }

    protected Header csrfHeader(AccessCookieFilter accessCookieFilter) {
        return new Header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken());
    }

    @SneakyThrows
    protected void stubForSaveProvider(Connection connection) {
        Map<String, Object> provider = localManage.saveProvider(connection);
        String body = objectMapper.writeValueAsString(provider);
        MappingBuilder mappingBuilder = StringUtils.hasText(connection.getManageIdentifier()) ?
                put(urlPathMatching("/manage/api/internal/metadata")) :
                post(urlPathMatching("/manage/api/internal/metadata"));
        stubFor(mappingBuilder
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

    @SneakyThrows
    protected void stubForDeleteProvider(EntityType entityType, String manageIdentifier) {
        String url = String.format("/manage/api/internal/metadata/%s/%s",
                entityType.name(),
                manageIdentifier);
        stubFor(delete(urlPathMatching(url))
                .atPriority(1)
                .willReturn(aResponse()
                        .withStatus(204)));
    }

    @SneakyThrows
    protected void stubForGetProvider(Connection connection) {
        Map<String, Object> provider = localManage.providerById(connection);
        String body = objectMapper.writeValueAsString(provider);
        stubFor(get(String.format("/manage/api/internal/metadata/%s/%s",
                connection.getProtocol().name(),
                connection.getManageIdentifier()))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

    @SneakyThrows
    protected void stubForGetProvider(EntityType entityType, String manageIdentifier, Environment environment) {
        Map<String, Object> provider = localManage.providerById(entityType, manageIdentifier, environment);
        String body = objectMapper.writeValueAsString(provider);
        stubFor(get(String.format("/manage/api/internal/metadata/%s/%s",
                entityType.name(),
                manageIdentifier))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

    @SneakyThrows
    protected void stubForGetChangeRequests(List<Map<String, Object>> changeProviders) {
        String body = objectMapper.writeValueAsString(changeProviders);
        stubFor(get(urlPathMatching("/manage/api/internal/change-requests/.*/.*"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withStatus(200)
                        .withBody(body)));
    }

    @SneakyThrows
    protected List<Map<String, Object>> getChangeRequests() {
        return objectMapper.readValue(new ClassPathResource("/manage/change_requests.json").getInputStream(), new TypeReference<>() {
        });
    }

    @SneakyThrows
    protected void stubForStats() {
        Map<String, Long> stats = Map.of();
        String body = objectMapper.writeValueAsString(stats);
        stubFor(get("/manage/api/internal/stats")
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

    @SneakyThrows
    protected void stubForIdentityProviderByInstitutionalGUID(String organisationGuid) {
        List<Map<String, Object>> providers = localManage.identityProvidersByInstitutionalGUID(Environment.PROD, organisationGuid);
        String body = objectMapper.writeValueAsString(providers);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_idp"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

    @SneakyThrows
    protected void stubForIdentityProviderByEntityId(String entityId) {
        Map<String, Object> provider = localManage.identityProviderByEntityID(entityId);
        String body = objectMapper.writeValueAsString(List.of(provider));
        stubFor(post("/manage/api/internal/search/saml20_idp")
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
    }

    @SneakyThrows
    protected void stubForIdentityProviders() {
        List<Map<String, Object>> providers = localManage.providers(Environment.TEST, EntityType.saml20_idp);
        String body = objectMapper.writeValueAsString(providers);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_idp"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));

    }

    @SneakyThrows
    protected void stubForServiceProviders() {
        List<Map<String, Object>> providers = localManage.providers(Environment.TEST, EntityType.saml20_sp);
        List<Map<String, Object>> relyingParties = localManage.providers(Environment.TEST, EntityType.oidc10_rp);
        String body = objectMapper.writeValueAsString(providers);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_sp"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
        body = objectMapper.writeValueAsString(relyingParties);
        stubFor(post(urlPathMatching("/manage/api/internal/search/oidc10_rp"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));

    }

    private void doSeed() {
        this.userRepository.deleteAllInBatch();
        this.applicationRepository.deleteAllInBatch();
        this.organizationRepository.deleteAllInBatch();
        this.joinRequestRepository.deleteAllInBatch();

        User superUser =
                new User(true, SUPER_SUB, SUPER_SUB, "example.com", "David", "Doe", "david.doe@example.com");
        User manager =
                new User(false, MANAGE_SUB, MANAGE_SUB, "example.com", "Mary", "Doe", "mary.doe@example.com");
        User guest =
                new User(false, GUEST_SUB, GUEST_SUB, "eduid.nl", "Peter", "Doe", "peter.doe@example.com");
        User externalUser =
                new User(false, EXTERNAL_USER_SUB, EXTERNAL_USER_SUB, "eduid.nl", "Ex", "Doe", "ex.doe@eduid.nl");
        User multipleOrganizationUser =
                new User(true, MULTIPLE_ORG_SUB, MULTIPLE_ORG_SUB, "eduid.nl", "Mos", "Doe", "mos.doe@example.com");
        doSave(this.userRepository, superUser, manager, guest, externalUser, multipleOrganizationUser);

        Organization shareLogics = new Organization(SHARE_LOGICS, "sharelogics.org", "7", 1);
        Organization logistics = new Organization(LOGISTICS, "logistics.org", "8", 1);
        Organization farWind = new Organization(FAR_WIND, "farwind.org");

        doSave(this.organizationRepository, shareLogics, logistics, farWind);

        OrganizationMembership adminOfShareLogics = new OrganizationMembership(manager, shareLogics, Authority.ADMIN);
        OrganizationMembership memberOfShareLogics = new OrganizationMembership(multipleOrganizationUser, shareLogics, Authority.MEMBER);
        OrganizationMembership guestOfShareLogics = new OrganizationMembership(externalUser, shareLogics, Authority.GUEST);
        OrganizationMembership memberOfFarWind = new OrganizationMembership(guest, farWind, Authority.MEMBER);
        OrganizationMembership memberLogics = new OrganizationMembership(multipleOrganizationUser, logistics, Authority.MEMBER);
        doSave(this.organizationMembershipRepository, adminOfShareLogics, memberOfFarWind, guestOfShareLogics, memberOfShareLogics, memberLogics);

        Application buddyCheck = new Application(BUDDY_CHECK, shareLogics, "System", Map.of());
        Application techno = new Application(TECHNO, shareLogics, "System", Map.of());

        Application nitroMap = new Application(NITRO_MAP, farWind, "System", Map.of());
        doSave(this.applicationRepository, buddyCheck, techno, nitroMap);

        ApplicationMembership applicationMembershipBuddyCheck = new ApplicationMembership(buddyCheck, adminOfShareLogics);
        ApplicationMembership applicationMembershipGuest = new ApplicationMembership(buddyCheck, guestOfShareLogics);
        doSave(this.applicationMembershipRepository, applicationMembershipBuddyCheck, applicationMembershipGuest);

        Connection buddyCheckConnectionTest = new Connection(BUDDY_CHECK_TEST, buddyCheck, Map.of(
                "contactPersons", List.of(new Contact("technical", "John", "Doe", "jdoe@example.com")),
                "entityID", "https://engine.test.surfconext.nl",
                "grantTypes", List.of("authorization_code", "refresh_token"),
                "redirectUrls", List.of("http://localhost:8080/redirect"),
                "arp", Map.of(
                        "profile", "personalized",
                        "attributes", Map.of(
                                "urn:mace:dir:attribute-def:cn",
                                List.of(Map.of("value", "*", "source", "idp", "motivation", "Default for profile"))
                        ),
                        "motivation", "Please")),
                EntityType.oidc10_rp,
                Environment.TEST);
        Connection buddyCheckConnectionProd = new Connection(BUDDY_CHECK_PROD, buddyCheck, Map.of(
                "contactPersons", List.of(new Contact("technical", "John", "Doe", "jdoe@example.com")),
                "entityID", "https://engine.test.surfconext.nl",
                "grantTypes", List.of("authorization_code", "refresh_token"),
                "redirectUrls", List.of("http://localhost:8080/redirect"),
                "arp", Map.of(
                        "profile", "personalized",
                        "attributes", Map.of(
                                "urn:mace:dir:attribute-def:cn",
                                List.of(Map.of("value", "*", "source", "idp", "motivation", "Default for profile"))
                        ),
                        "motivation", "Please")),
                EntityType.oidc10_rp,
                Environment.PROD);
        //Need to mimic a pending production connection
        buddyCheckConnectionProd.setManageIdentifier(MANAGE_IDENTIFIER);
        buddyCheckConnectionProd.setManageVersion(1);
        buddyCheckConnectionProd.setStatus(ConnectionStatus.PENDING_PROD);
        buddyCheckConnectionProd.setState(State.prodaccepted);
        doSave(connectionRepository, buddyCheckConnectionTest, buddyCheckConnectionProd);

        Invitation invitationShareLogics = new Invitation(
                Language.en,
                SHARE_LOGICS_INVITATION_HASH,
                "jdoe@invitation.org",
                "Please join",
                Authority.MEMBER,
                shareLogics,
                manager,
                Set.of(techno)
        );
        doSave(this.invitationRepository, invitationShareLogics);

        JoinRequest joinRequest = new JoinRequest(guest, shareLogics, "Please", Language.en);
        JoinRequest joinRequestSuperUser = new JoinRequest(superUser, shareLogics, "Please", Language.en);
        doSave(this.joinRequestRepository, joinRequest, joinRequestSuperUser);
    }

    @SafeVarargs
    private <M> void doSave(JpaRepository<M, Long> repository, M... entities) {
        List<M> persistedEntities = repository.saveAll(Arrays.asList(entities));
        persistedEntities.stream()
                .filter(entity -> entity instanceof NameHolder)
                .forEach(entity -> {
                    NameHolder nameHolder = (NameHolder) entity;
                    this.seedIdentifiers.put(nameHolder.getName(), nameHolder.getId());
                });
    }


}
