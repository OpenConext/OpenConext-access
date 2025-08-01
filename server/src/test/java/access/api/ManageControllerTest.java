package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.EntityType;
import access.model.Environment;
import com.nimbusds.jose.util.IOUtils;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.UrlResource;
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
    void providersByEntityId() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        String entityID = "https://network";
        List<Map<String, Object>> providers = localManage.providersByEntityID(Environment.TEST, EntityType.saml20_idp, entityID);
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
                .post("/api/v1/manage/providers-by-entityid/{environment}")
                .as(new TypeRef<>() {
                });
        assertEquals(1, serviceProviders.size());
    }

    @Test
    void privacyInfo() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        List<Map<String, Object>> privacyInfo = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/manage/privacy")
                .as(new TypeRef<>() {
                });
        assertEquals(8, privacyInfo.size());
    }

    @Test
    void arpInfo() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Map<String, Object> arpInfo = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
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

    private boolean attributePresent(String attribute, List<Map<String, Object>> attributes) {
        return attributes.stream().anyMatch(attr -> attr.get("name").equals(attribute));
    }


}