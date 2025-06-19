package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.UserInfoEnhancer;
import access.model.Organization;
import access.model.User;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SuppressWarnings("unchecked")
class UserControllerTest extends AbstractTest {

    @Test
    void meWithOauth2Login() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", ADMIN_SUB);

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get(accessCookieFilter.apiURL())
                .as(User.class);
        assertEquals(ADMIN_SUB, user.getEmail());

        Map res = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/config")
                .as(Map.class);
        assertTrue((Boolean) res.get("authenticated"));
    }

    @Test
    void meManagerWithOauth2Login() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me",
                MANAGE_SUB, (UserInfoEnhancer)
                        userInfo -> userInfo.put("email", "changed.doe@example.com")
        );

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get(accessCookieFilter.apiURL())
                .as(User.class);
        assertEquals("changed.doe@example.com", user.getEmail());
        assertEquals(1, user.getOrganizationMemberships().size());

        Organization organization = user.getOrganizationMemberships().stream().findFirst().get().getOrganization();
        assertEquals("ShareLogics", organization.getName());
    }

    @Test
    void meManagerWithMockLogin() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(User.class);
        assertEquals(1, user.getOrganizationMemberships().size());

        Organization organization = user.getOrganizationMemberships().stream().findFirst().get().getOrganization();
        assertEquals("ShareLogics", organization.getName());
    }

    @Test
    void meWithMockLoginMultipleOrganizations() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MULTIPLE_ORG_SUB);

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(User.class);
        assertEquals(2, user.getOrganizationMemberships().size());

        List<String> names = user.getOrganizationMemberships().stream()
                .map(organizationMembership -> organizationMembership.getOrganization().getName()).
                sorted()
                .toList();
        assertEquals(List.of(LOGISTICS, SHARE_LOGICS), names);
    }

    @Test
    void meNewUserWithExistingOrganizationTestLogin() {
        Map<String, Object> attributes = Map.of(
                "eduperson_principal_name", "debby@sharelogics.org",
                "email", "debby@sharelogics.org",
                "family_name", "Davids",
                "given_name", "Debby",
                "name", "Debby Davids",
                "schac_home_organization", "sharelogics.org",
                "sub", "urn:collab:person:providence:new");
        AccessCookieFilter accessCookieFilter = mockLoginFlow(attributes);

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/me")
                .as(new TypeRef<>() {
                });
        assertEquals(1, user.getOrganizationMemberships().size());

        Organization organization = user.getOrganizationMemberships().stream().findFirst().get().getOrganization();
        assertEquals(SHARE_LOGICS, organization.getName());
        assertEquals(attributes.get("schac_home_organization"), organization.getSchacHomeOrganization());
    }

    @Test
    void arpInfo() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        Map<String, Object> arpInfo = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/users/arp")
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

    private User convertuser(Map<String, Object> userMap) {
        User user = objectMapper.convertValue(userMap, User.class);
        List<Map<String, Object>> organizationMemberships = (List<Map<String, Object>>) userMap.get("organizationMemberships");
        user.getOrganizationMemberships().forEach(organizationMembership ->
                organizationMembership.setOrganization(new Organization()));
        return user;
    }
}