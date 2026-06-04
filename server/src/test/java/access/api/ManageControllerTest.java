package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.manage.MFAType;
import access.manage.StepUpType;
import access.model.EntityType;
import access.model.Organization;
import access.security.InstitutionAdmin;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.nimbusds.jose.util.IOUtils;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SuppressWarnings("unchecked")
class ManageControllerTest extends AbstractTest {

    @Test
    void parseForbidden() {
        given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("url", "https://engine.test.surfconext.nl/authentication/sp/metadata"))
                .post("/api/v1/manage/parse")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void parseURL() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);
        String xml = IOUtils.readInputStreamToString(new ClassPathResource("/metadata.xml").getInputStream());
        stubFor(get(urlPathMatching("/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "html/xml")
                        .withBody(xml)
                        .withStatus(200)));

        List<Map<String, Object>> metaDataList = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("url", "http://localhost:8081/metadata"))
                .post("/api/v1/manage/parse")
                .as(new TypeRef<>() {
                });
        assertEquals(1, metaDataList.size());
        Map<String, Object> metaData = metaDataList.getFirst();
        assertEquals("SURFconext TEST EngineBlock", metaData.get("name"));
    }

    @Test
    void parseXML() throws Exception {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        String xml = IOUtils.readInputStreamToString(new ClassPathResource("/metadata.xml").getInputStream());
        List<Map<String, Object>> metaDataList = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("xml", xml))
                .post("/api/v1/manage/parse")
                .as(new TypeRef<>() {
                });
        assertEquals(1, metaDataList.size());
        Map<String, Object> metaData = metaDataList.getFirst();
        assertEquals("SURFconext TEST EngineBlock", metaData.get("name"));
    }

    @Test
    void identityProviders() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        this.stubForIdentityProviders();
        List<Map<String, Object>> identityProviders = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/manage/identity-providers")
                .as(new TypeRef<>() {
                });
        assertEquals(3, identityProviders.size());
    }

    @Test
    void autoComplete() throws JsonProcessingException {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Map<String, List<Map<String, Object>>> entities = localManage.autoCompleteEntities(EntityType.saml20_sp, "Wiki");
        String body = objectMapper.writeValueAsString(entities);
        stubFor(get(urlPathMatching("/manage/api/internal/autocomplete/saml20_sp"))
                .withQueryParam("query", matching("Wiki"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));

        List<Map<String, Object>> suggestions = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("type", EntityType.saml20_sp)
                .queryParam("query", "Wiki")
                .get("/api/v1/manage/autocomplete/{type}")
                .as(new TypeRef<>() {
                });
        assertEquals(1, suggestions.size());
    }

    @SneakyThrows
    @Test
    void policyByServiceProvider() {
        Map<String, Object> identityProvider = super.stubForIdentityProviderByEntityId("http://mock-idp");
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        String serviceProviderEntityId = "https://network";
        //Stub the actual call to fetch the policies for a SP
        this.stubForPolicyByServiceProvider("http://mock-idp", serviceProviderEntityId);
        //The IdP is fetched to check the allowed entities
        this.stubForGetProvider(EntityType.saml20_idp, "7");
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        List<Map<String, Object>> policies = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("entityId", serviceProviderEntityId)
                .queryParam("organizationId", organization.getId())
                .get("/api/v1/manage/policies")
                .as(new TypeRef<>() {
                });
        assertEquals(1, policies.size());
    }

    @SneakyThrows
    @Test
    void policiesByServiceProviders() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(ADMIN_SUB);
        stubForPoliciesByServiceProviders();

        List<Map<String, Object>> policies = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(List.of("SURFACCESS-c85b455c-3f42-4945-b224-3ae433f2be0b"))
                .post("/api/v1/manage/policies/by-service-providers")
                .as(new TypeRef<>() {
                });
        assertEquals(1, policies.size());
    }

    @SneakyThrows
    @Test
    void policyByIdentityProvider() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        //Stub the actual call to fetch the policies for a IdP
        this.stubForGetProvider(EntityType.saml20_idp, "7");
        this.stubForPolicyByIdentityProvider("http://mock-idp");

        List<Map<String, Object>> policies = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("organizationId", organization.getId())
                .get("/api/v1/manage/identity-provider/policies")
                .as(new TypeRef<>() {
                });
        assertEquals(1, policies.size());
    }

    @SneakyThrows
    @Test
    void policyByServiceProviderNotAllowed() {
        Map<String, Object> identityProvider = super.stubForIdentityProviderByEntityId("http://mock-idp");
        Map<String, Object> attributes = Map.of(
                "sub", INSTITUTION_ADMIN,
                InstitutionAdmin.IDENTITY_PROVIDER, identityProvider);
        AccessCookieFilter accessCookieFilter = mockLoginFlow(attributes);

        String serviceProviderEntityId = "nope";
        //The IdP is fetched to check the allowed entities
        this.stubForGetProvider(EntityType.saml20_idp, "7");
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("entityId", serviceProviderEntityId)
                .queryParam("organizationId", organization.getId())
                .get("/api/v1/manage/policies")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @SneakyThrows
    @Test
    void uniqueEntityId() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        String entityID = "https://network";
        List<Map<String, Object>> providers = localManage.uniqueEntityId(EntityType.saml20_idp, entityID);
        String body = objectMapper.writeValueAsString(providers);
        stubFor(post(urlPathMatching("/manage/api/internal/uniqueEntityId/saml20_sp"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));
        List<Map<String, Object>> serviceProviders = given()
                .when()
                .header(csrfHeader(accessCookieFilter))
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("entityID", entityID))
                .post("/api/v1/manage/unique-entity-id")
                .as(new TypeRef<>() {
                });
        assertEquals(1, serviceProviders.size());
    }

    @Test
    void privacyInfo() {
        List<Map<String, Object>> privacyInfo = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/manage/privacy")
                .as(new TypeRef<>() {
                });
        assertEquals(8, privacyInfo.size());
    }

    @Test
    void arpInfo() {
        Map<String, Object> arpInfo = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/manage/arp")
                .as(new TypeRef<>() {
                });
        List<Map<String, Object>> profiles = (List<Map<String, Object>>) arpInfo.get("profiles");
        List<Map<String, Object>> attributes = (List<Map<String, Object>>) arpInfo.get("attributes");
        //Check if all the attributes and optionalAttributes in the profiles are present in the attribute list
        boolean allAttributesPresent = profiles.stream().allMatch(profile -> {
            List<String> profileAttributes = (List<String>) profile.get("attributes");
            List<String> optionalAttributes = (List<String>) profile.get("optionalAttributes");
            return profileAttributes.stream().allMatch(attribute -> attributePresent(attribute, attributes)) &&
                    optionalAttributes.stream().allMatch(attribute -> attributePresent(attribute, attributes));
        });
        assertTrue(allAttributesPresent);
    }

    @Test
    void allowedAttributes() throws JsonProcessingException {
        List<Map<String, Object>> allowedAttributes = localManage.allowedAttributes();
        String body = objectMapper.writeValueAsString(allowedAttributes);
        stubFor(get("/manage/api/internal/protected/allowed-attributes")
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(body)
                        .withStatus(200)));

        allowedAttributes = given()
                .when()
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/manage/allowed-attributes")
                .as(new TypeRef<>() {
                });
        assertEquals(9, allowedAttributes.size());
    }

    @Test
    void createPolicy() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);
        String policy = IOUtils.readInputStreamToString(new ClassPathResource("/manage/new_policy.json").getInputStream());
        stubFor(post(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(policy)
                        .withStatus(201)));
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        Map<String, Object> newPolicy = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("organizationId", organization.getId())
                .body(policy)
                .post("/api/v1/manage/policies")
                .as(new TypeRef<>() {
                });
        Map<String, Object> expectedPolicy = objectMapper.readValue(policy, new TypeReference<>() {
        });
        assertEquals(expectedPolicy, newPolicy);
    }

    @Test
    void uniquePolicyName() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);
        stubFor(post(urlPathMatching("/manage/api/internal/uniquePolicyName/policy"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody("[]")
                        .withStatus(200)));

        List<Map<String, Object>> policies = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("name", "policyName"))
                .post("/api/v1/manage/unique-policy-name")
                .as(new TypeRef<>() {
                });
        assertEquals(0, policies.size());
    }

    @Test
    void updatePolicy() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        Map<String, Object> policyFromDB = super.stubForGetProvider(EntityType.policy, "1");
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier());

        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(policyFromDB))
                        .withStatus(201)));

        Map<String, Object> updatedPolicy = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("organizationId", organization.getId())
                .body(policyFromDB)
                .put("/api/v1/manage/policies")
                .as(new TypeRef<>() {
                });
        assertEquals(policyFromDB, updatedPolicy);
    }

    @Test
    void deletePolicy() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);
        // See server/src/main/resources/manage/policy.json
        String manageIdentifier = "1";
        super.stubForGetProvider(EntityType.policy, "1");
        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        stubForGetProvider(EntityType.saml20_idp, organization.getManageIdentifier());

        String url = String.format("/manage/api/internal/metadata/%s/%s",
                EntityType.policy.name(), manageIdentifier);
        stubFor(delete(urlPathMatching(url))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withStatus(204)));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("organizationId", organization.getId())
                .pathParam("policyId", manageIdentifier)
                .delete("/api/v1/manage/policies/{policyId}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
    }

    @Test
    void rejectChangeRequest() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(ADMIN_SUB);
        stubFor(put(urlPathMatching("/manage/api/internal/change-requests/reject"))
                .willReturn(aResponse().withStatus(200)));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("id", "id", "type", EntityType.oidc10_rp.name(), "metaDataId", "MANAGE_IDENTIFIER"))
                .put("/api/v1/manage/reject-change-request")
                .then()
                .statusCode(200);

    }

    private boolean attributePresent(String attribute, List<Map<String, Object>> attributes) {
        return attributes.stream().anyMatch(attr -> attr.get("name").equals(attribute));
    }

    @Test
    void updateMetaDataConsent() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        Map<String, Object> identityProvider = stubForGetProvider(EntityType.saml20_idp, "7");
        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(identityProvider))
                        .withStatus(200)));

        Map<String, Object> consent = Map.of(
                "identityProviderId", "7",
                "name", "https://wiki",
                "type", "no_consent",
                "explanation:en", "Test EN",
                "explanation:nl", "Test NL"
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(consent)
                .put("/api/v1/manage/update/consent")
                .then()
                .statusCode(HttpStatus.CREATED.value());
    }

    @Test
    void updateMetaDataConsentForbiddenForGuest() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", GUEST_SUB);

        Map<String, Object> consent = Map.of(
                "identityProviderId", "7",
                "name", "https://wiki",
                "type", "no_consent",
                "explanation:en", "Test EN",
                "explanation:nl", "Test NL"
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(consent)
                .put("/api/v1/manage/update/consent")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void updateMetaDataAssurance() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        Map<String, Object> identityProvider = stubForGetProvider(EntityType.saml20_idp, "7");
        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(identityProvider))
                        .withStatus(200)));

        Map<String, Object> assurance = Map.of(
                "identityProviderId", "7",
                "mfaEntity", Map.of("name", "https://wiki", "level", MFAType.transparentAuthnContext.getValue()),
                "stepupEntity", Map.of("name", "https://wiki", "level", "http://test2.surfconext.nl/assurance/loa1.5")
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.CREATED.value());
    }

    @Test
    void updateMetaDataAssuranceStepUpLoaTooLow() throws Exception {
        // ADMIN_SUB has no acr claim → loaLevel defaults to 1; loa2 requires loaLevel 2 → 403
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        stubForGetProvider(EntityType.saml20_idp, "7");

        Map<String, Object> assurance = Map.of(
                "identityProviderId", "7",
                "mfaEntity", Map.of("name", "https://wiki", "level", MFAType.transparentAuthnContext.getValue()),
                "stepupEntity", Map.of("name", "https://wiki", "level", "http://test2.surfconext.nl/assurance/loa2")
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void updateMetaDataAssuranceMfaLoaTooLow() throws Exception {
        // ADMIN_SUB has no acr claim → loaLevel defaults to 1; loa2 requires loaLevel 2 → 403
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        stubForGetProvider(EntityType.saml20_idp, "7");


        Map<String, Object> stepupEntity = new HashMap<>();
        stepupEntity.put("name", "https://wiki");
        stepupEntity.put("level", null);
        Map<String, Object> assurance = Map.of(
                "identityProviderId", "7",
                "mfaEntity", Map.of("name", "https://wiki", "level", MFAType.mfa.getValue()),
                "stepupEntity", stepupEntity);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void updateMetaDataAssuranceWithSufficientLoaLevel() throws Exception {
        // Inject acr claim so loaLevel is resolved to 2, allowing loa2 step-up
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB,
                userInfo -> {
                    userInfo.put("acr", "http://test2.surfconext.nl/assurance/loa2");
                    return userInfo;
                });

        Map<String, Object> identityProvider = stubForGetProvider(EntityType.saml20_idp, "7");
        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(identityProvider))
                        .withStatus(200)));

        Map<String, Object> assurance = Map.of(
                "identityProviderId", "7",
                "mfaEntity", Map.of("name", "https://wiki", "level", "https://refeds.org/profile/mfa"),
                "stepupEntity", Map.of("name", "https://wiki", "level", "http://test2.surfconext.nl/assurance/loa2")
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.CREATED.value());
    }

    @Test
    void updateMetaDataAssuranceForbiddenForGuest() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", GUEST_SUB);

        Map<String, Object> assurance = Map.of(
                "identityProviderId", "7",
                "mfaEntity", Map.of("name", "https://wiki", "level", "http://schemas.microsoft.com/claims/multipleauthn"),
                "stepupEntity", Map.of("name", "https://wiki", "level", "http://test2.surfconext.nl/assurance/loa1.5")
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void updateMetaDataAssuranceClearsMfaAndStepup() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        Map<String, Object> identityProvider = stubForGetProvider(EntityType.saml20_idp, "7");
        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(identityProvider))
                        .withStatus(200)));

        // Sending null levels signals "clear this entry"
        Map<String, Object> assurance = new java.util.HashMap<>();
        assurance.put("identityProviderId", "7");
        Map<String, Object> mfaEntity = new java.util.HashMap<>();
        mfaEntity.put("name", "https://wiki");
        mfaEntity.put("level", null);
        assurance.put("mfaEntity", mfaEntity);
        Map<String, Object> stepupEntity = new java.util.HashMap<>();
        stepupEntity.put("name", "https://wiki");
        stepupEntity.put("level", null);
        assurance.put("stepupEntity", stepupEntity);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.CREATED.value());
    }

    @Test
    void updateMetaDataAssuranceNullStepupSkipsLoaCheck() throws Exception {
        // ADMIN_SUB has loaLevel=1; loa2 would normally be blocked, but null stepup skips the LoA check
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        Map<String, Object> identityProvider = stubForGetProvider(EntityType.saml20_idp, "7");
        stubFor(put(urlPathMatching("/manage/api/internal/metadata"))
                .willReturn(aResponse().withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(identityProvider))
                        .withStatus(200)));

        Map<String, Object> assurance = new java.util.HashMap<>();
        assurance.put("identityProviderId", "7");
        Map<String, Object> mfaEntity = new java.util.HashMap<>();
        mfaEntity.put("name", "https://wiki");
        mfaEntity.put("level", MFAType.transparentAuthnContext.getValue());
        assurance.put("mfaEntity", mfaEntity);
        Map<String, Object> stepupEntity = new java.util.HashMap<>();
        stepupEntity.put("name", "https://wiki");
        stepupEntity.put("level", null);
        assurance.put("stepupEntity", stepupEntity);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(assurance)
                .put("/api/v1/manage/update/assurance")
                .then()
                .statusCode(HttpStatus.CREATED.value());
    }

    @Test
    void serviceProviders() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        // ShareLogics org has manageIdentifier="7"; seed IdP has explicit allowedEntities, not allowedall
        stubForGetProvider(EntityType.saml20_idp, "7");
        // serviceProvidersByEntityID posts to both saml20_sp and oidc10_rp search endpoints
        stubForServiceProviders();

        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        List<Map<String, Object>> serviceProviders = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organization.getId())
                .get("/api/v1/manage/allowed-service-providers/{organizationId}")
                .as(new TypeRef<>() {
                });
        assertTrue(serviceProviders.size() > 0);
    }

    @Test
    void serviceProvidersForbiddenForGuest() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", GUEST_SUB);

        Organization organization = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationId", organization.getId())
                .get("/api/v1/manage/allowed-service-providers/{organizationId}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

}