package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.menu.MenuResponse;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MenuControllerTest extends AbstractTest {

    private MenuResponse externalMenu(String sub, String organizationId) {
        var request = given()
            .when()
            .auth().preemptive().basic("invite", "secret")
            .accept(ContentType.JSON)
            .queryParam("sub", sub);
        if (organizationId != null) {
            request = request.queryParam("organizationId", organizationId);
        }
        return request
            .get("/api/external/v1/menu")
            .as(MenuResponse.class);
    }

    @Test
    void sessionMenuForAdminOfInstitution() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", MANAGE_SUB);
        MenuResponse menu = given()
            .when()
            .filter(accessCookieFilter.cookieFilter())
            .accept(ContentType.JSON)
            .get("/api/v1/menu")
            .as(MenuResponse.class);
        assertTrue(menu.menuItems().containsAll(
            List.of("home", "catalogue", "serviceDesk", "idp", "users", "yourApps", "accessibleApps", "invite", "sram", "statistics", "policies")));
        assertEquals(SHARE_LOGICS, menu.currentOrganization().name());
        assertEquals(1, menu.organizations().size());
        assertEquals("John Doe", menu.user().name());
    }

    @Test
    void sessionMenuUnauthenticated() {
        given()
            .when()
            .accept(ContentType.JSON)
            .redirects().follow(false)
            .get("/api/v1/menu")
            .then()
            .statusCode(org.hamcrest.Matchers.anyOf(org.hamcrest.Matchers.is(401), org.hamcrest.Matchers.is(302)));
    }

    @Test
    void externalMenuAdmin() {
        MenuResponse menu = externalMenu(MANAGE_SUB, null);
        assertTrue(menu.menuItems().contains("statistics"));
        assertTrue(menu.menuItems().contains("policies"));
        assertTrue(menu.menuItems().contains("invite"));
        assertEquals("7", menu.currentOrganization().manageIdentifier());
    }

    @Test
    void externalMenuGuestOnly() {
        MenuResponse menu = externalMenu(EXTERNAL_USER_SUB, null);
        assertTrue(menu.menuItems().contains("yourApps"));
        assertFalse(menu.menuItems().contains("idp"));
        assertFalse(menu.menuItems().contains("invite"));
        assertFalse(menu.menuItems().contains("statistics"));
    }

    @Test
    void externalMenuMemberOfNonInstitution() {
        MenuResponse menu = externalMenu(GUEST_SUB, null);
        assertTrue(menu.menuItems().containsAll(List.of("idp", "users", "yourApps")));
        assertFalse(menu.menuItems().contains("invite"));
        assertFalse(menu.menuItems().contains("policies"));
    }

    @Test
    void externalMenuSuperUserWithoutMemberships() {
        MenuResponse menu = externalMenu(SUPER_SUB, null);
        //Everyone gets home, catalogue and service desk; the feedback item is only for environments without the feedback widget
        assertEquals(List.of("home", "catalogue", "serviceDesk"), menu.menuItems());
        assertTrue(menu.organizations().isEmpty());
        assertNull(menu.currentOrganization());
        assertTrue(menu.user().superUser());
    }

    @Test
    void externalMenuSelectsRequestedOrganization() {
        MenuResponse first = externalMenu(MULTIPLE_ORG_SUB, null);
        assertEquals(2, first.organizations().size());
        MenuResponse requested = externalMenu(MULTIPLE_ORG_SUB, "8");
        assertEquals("8", requested.currentOrganization().manageIdentifier());
        MenuResponse requestedById = externalMenu(MULTIPLE_ORG_SUB,
            String.valueOf(first.organizations().get(1).id()));
        assertEquals(first.organizations().get(1).id(), requestedById.currentOrganization().id());
        //An unknown organization falls back to the first membership
        MenuResponse unknown = externalMenu(MULTIPLE_ORG_SUB, "nope");
        assertEquals(first.currentOrganization().id(), unknown.currentOrganization().id());
    }

    @Test
    void externalMenuUnknownUser() {
        given()
            .when()
            .auth().preemptive().basic("invite", "secret")
            .accept(ContentType.JSON)
            .queryParam("sub", "nope")
            .get("/api/external/v1/menu")
            .then()
            .statusCode(404);
    }

    @Test
    void externalMenuWrongCredentials() {
        given()
            .when()
            .auth().preemptive().basic("invite", "nope")
            .accept(ContentType.JSON)
            .queryParam("sub", MANAGE_SUB)
            .get("/api/external/v1/menu")
            .then()
            .statusCode(401);
    }

    @Test
    void externalMenuForbiddenForLifecycleUser() {
        given()
            .when()
            .auth().preemptive().basic("lifecycle", "secret")
            .accept(ContentType.JSON)
            .queryParam("sub", MANAGE_SUB)
            .get("/api/external/v1/menu")
            .then()
            .statusCode(403);
    }
}
