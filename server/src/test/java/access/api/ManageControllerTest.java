package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.EntityType;
import access.model.Environment;
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
                .pathParam("environment", Environment.TEST)
                .get("/api/v1/manage/identity-providers/{environment}")
                .as(new TypeRef<>() {
                });
        assertEquals(3, identityProviders.size());
    }

    @SneakyThrows
    @Test
    void policyByServiceProvider() {
        Map<String, Object> identityProvider = super.stubForIdentityProviderByEntityId("http://mock-idp");
        Map<String, Object> attributes = Map.of(
                "sub", INSTITUTION_ADMIN,
                InstitutionAdmin.IDENTITY_PROVIDER, identityProvider);
        AccessCookieFilter accessCookieFilter = mockLoginFlow(attributes);

        String serviceProviderEntityId = "https://network";
        //Stub the actual call to fetch the policies for a SP
        this.stubForPolicyByServiceProvider("http://mock-idp", serviceProviderEntityId);
        //The IdP is fetched to check the allowed entities
        this.stubForGetProvider(EntityType.saml20_idp, "7", Environment.PROD);

        List<Map<String, Object>> policies = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("entityId", serviceProviderEntityId)
                .get("/api/v1/manage/policies")
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
        this.stubForGetProvider(EntityType.saml20_idp, "7", Environment.PROD);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .queryParam("entityId", serviceProviderEntityId)
                .get("/api/v1/manage/policies")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @SneakyThrows
    @Test
    void uniqueEntityId() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        String entityID = "https://network";
        List<Map<String, Object>> providers = localManage.uniqueEntityId(Environment.TEST, EntityType.saml20_idp, entityID);
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
                .pathParam("environment", Environment.TEST)
                .body(Map.of("entityID", entityID))
                .post("/api/v1/manage/unique-entity-id/{environment}")
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
        List<Map<String, Object>> allowedAttributes  = localManage.allowedAttributes();
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

        Map<String, Object> newPolicy = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
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
        String manageIdentifier = "1";
        Map<String, Object> policyFromDB = super.stubForGetProvider(EntityType.policy, manageIdentifier, Environment.PROD);

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
        super.stubForGetProvider(EntityType.policy, manageIdentifier, Environment.PROD);

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
                .pathParam("policyId", manageIdentifier)
                .delete("/api/v1/manage/policies/{policyId}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
    }

    private boolean attributePresent(String attribute, List<Map<String, Object>> attributes) {
        return attributes.stream().anyMatch(attr -> attr.get("name").equals(attribute));
    }


}