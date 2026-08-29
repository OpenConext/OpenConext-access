package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrganizationMembershipControllerTest extends AbstractTest {

    @Test
    void update() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long organizationMembershipId = super.seedIdentifiers.get(OrganizationMembership.class.getName().concat(SHARE_LOGICS).concat(Authority.MEMBER.name()));
        Map<String, Object> body = Map.of("id", organizationMembershipId, "authority", Authority.GUEST.name());

        Map<String, Object> result = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(body)
                .put("/api/v1/organization_memberships")
                .as(new TypeRef<>() {
                });
        assertEquals(Authority.GUEST.name(), result.get("authority"));
    }

    @Test
    void updateByPlainMemberNotAllowed() {
        //Security regression test (AUDIT.md #3 - Critical): a plain MEMBER must never be able to change another
        //member's authority (e.g. promote a GUEST to MEMBER, or demote an ADMIN) - only an ADMIN may do this.
        //(Note: MULTIPLE_ORG_SUB, though seeded as MEMBER of SHARE_LOGICS, is also seeded as a super-user and so
        //can't be used here - super-users bypass all authority checks. A dedicated, genuinely non-super MEMBER is
        //created inline instead.)
        String plainMemberSub = "urn:collab:person:example.com:plain_member";
        User plainMemberUser = new User(false, plainMemberSub, plainMemberSub, "eduid.nl",
                "Plain", "Member", "plain.member@eduid.nl", "http://mock-idp");
        userRepository.save(plainMemberUser);
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        organizationMembershipRepository.save(new OrganizationMembership(plainMemberUser, shareLogics, Authority.MEMBER));

        AccessCookieFilter accessCookieFilter = mockLoginFlow(plainMemberSub);
        Long organizationMembershipId = super.seedIdentifiers.get(OrganizationMembership.class.getName().concat(SHARE_LOGICS).concat(Authority.GUEST.name()));
        Map<String, Object> body = Map.of("id", organizationMembershipId, "authority", Authority.MEMBER.name());

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(body)
                .put("/api/v1/organization_memberships")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

        assertEquals(Authority.GUEST, organizationMembershipRepository.findById(organizationMembershipId).get().getAuthority());
    }

    @Test
    void delete() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization organization = organizationRepository.findUserManagementOrganizationById(seedIdentifiers.get(SHARE_LOGICS)).get();
        OrganizationMembership organizationMembership = organization.getOrganizationMemberships().stream()
                .filter(membership -> membership.getAuthority().equals(Authority.MEMBER))
                .findFirst()
                .get();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationMembershipId", organizationMembership.getId())
                .delete("/api/v1/organization_memberships/{organizationMembershipId}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        assertTrue(organizationMembershipRepository.findById(organizationMembership.getId()).isEmpty());
    }

    @Test
    void updateLastRemainingAdminNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long organizationMembershipId = super.seedIdentifiers.get(OrganizationMembership.class.getName().concat(SHARE_LOGICS).concat(Authority.ADMIN.name()));
        Map<String, Object> body = Map.of("id", organizationMembershipId, "authority", Authority.MEMBER.name());

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(body)
                .put("/api/v1/organization_memberships")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

        assertEquals(Authority.ADMIN, organizationMembershipRepository.findById(organizationMembershipId).get().getAuthority());
    }

    @Test
    void deleteLastRemainingAdminNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long organizationMembershipId = super.seedIdentifiers.get(OrganizationMembership.class.getName().concat(SHARE_LOGICS).concat(Authority.ADMIN.name()));

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("organizationMembershipId", organizationMembershipId)
                .delete("/api/v1/organization_memberships/{organizationMembershipId}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

        assertTrue(organizationMembershipRepository.findById(organizationMembershipId).isPresent());
    }
}