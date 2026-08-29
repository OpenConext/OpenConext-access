package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.*;
import access.request.ApplicationMembershipForm;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ApplicationMembershipControllerTest extends AbstractTest {

    @Test
    void allByOApplication() {
    }

    @Test
    void create() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", SUPER_SUB);
        Organization organization = organizationRepository.findById(seedIdentifiers.get(FAR_WIND)).get();
        Application application = applicationRepository.findById(seedIdentifiers.get(NITRO_MAP)).get();

        String orgMembershipName = OrganizationMembership.class.getName().concat(organization.getName()).concat(Authority.MEMBER.name());
        OrganizationMembership organizationMembership = organizationMembershipRepository.findById(seedIdentifiers.get(orgMembershipName)).get();

        ApplicationMembershipForm form = new ApplicationMembershipForm(
                organization.getId(),
                application.getId(),
                organizationMembership.getId()
        );
        ApplicationMembership applicationMembership = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(form)
                .post("/api/v1/application_memberships")
                .as(new TypeRef<>() {
                });
        assertNotNull(applicationMembership.getId());
    }

    @Test
    void createCrossOrganizationMembershipNotAllowed() {
        //Security regression test: organizationMembershipId is a client-supplied, globally-unscoped id. A
        //MEMBER/ADMIN of one organization (MANAGE_SUB is ADMIN of SHARE_LOGICS) must not be able to attach an
        //unrelated user's OrganizationMembership from a completely different organization (FAR_WIND) to one of
        //their own applications (BuddyCheck, in SHARE_LOGICS).
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        Application buddyCheck = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();

        String farWindMembershipName = OrganizationMembership.class.getName().concat(FAR_WIND).concat(Authority.MEMBER.name());
        OrganizationMembership farWindMembership = organizationMembershipRepository.findById(seedIdentifiers.get(farWindMembershipName)).get();

        ApplicationMembershipForm form = new ApplicationMembershipForm(
                shareLogics.getId(),
                buddyCheck.getId(),
                farWindMembership.getId()
        );
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(form)
                .post("/api/v1/application_memberships")
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    void delete() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        String identifier = ApplicationMembership.class.getName().concat(BUDDY_CHECK).concat(Authority.MEMBER.name());
        ApplicationMembership applicationMembership = applicationMembershipRepository.findById(seedIdentifiers.get(identifier)).get();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("membership_id", applicationMembership.getId())
                .delete("/api/v1/application_memberships/{membership_id}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());

        Optional<ApplicationMembership> optionalApplicationMembership =
                applicationMembershipRepository.findById(seedIdentifiers.get(identifier));
        assertTrue(optionalApplicationMembership.isEmpty());
    }

    @Test
    void deleteByGuestNotAllowed() {
        //Security regression test (AUDIT.md #6 - High): the lowest org authority tier (GUEST) must not be able
        //to revoke another user's application membership - only MEMBER and up. EXTERNAL_USER_SUB is seeded as
        //GUEST of SHARE_LOGICS.
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        String identifier = ApplicationMembership.class.getName().concat(BUDDY_CHECK).concat(Authority.MEMBER.name());
        ApplicationMembership applicationMembership = applicationMembershipRepository.findById(seedIdentifiers.get(identifier)).get();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("membership_id", applicationMembership.getId())
                .delete("/api/v1/application_memberships/{membership_id}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

        assertFalse(applicationMembershipRepository.findById(seedIdentifiers.get(identifier)).isEmpty());
    }
}