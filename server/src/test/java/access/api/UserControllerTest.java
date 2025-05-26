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

class UserControllerTest extends AbstractTest {

    @Test
    void meWithOauth2Login() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", "urn:collab:person:example.com:admin");

        User user = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get(accessCookieFilter.apiURL())
                .as(User.class);
        assertEquals("urn:collab:person:example.com:admin", user.getEmail());

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
    void meManagerWithTestLogin() {
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
}