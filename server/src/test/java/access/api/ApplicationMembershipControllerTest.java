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
    void deleteGuestByMemberNotOwnerOfAllGuestApplicationsNotAllowed() {
        //Issue #992: a plain MEMBER (not org ADMIN) may only remove a GUEST's application access if the MEMBER
        //is the creator of ALL applications the guest is a member of, not just the one being removed here.
        //MULTIPLE_ORG_SUB, though seeded as MEMBER of SHARE_LOGICS, is also seeded as a super-user, so a
        //dedicated, genuinely non-super MEMBER is created inline instead.
        String plainMemberSub = "urn:collab:person:example.com:plain_member_992";
        User plainMemberUser = new User(false, plainMemberSub, plainMemberSub, "eduid.nl",
                "Plain", "Member", "plain.member.992@eduid.nl", "http://mock-idp");
        userRepository.save(plainMemberUser);
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        organizationMembershipRepository.save(new OrganizationMembership(plainMemberUser, shareLogics, Authority.MEMBER));

        //The plain member owns BuddyCheck - the application whose guest membership they are trying to delete -
        //but Techno is owned by MANAGE_SUB, so the guest is also a member of an application the plain member
        //did not create
        Application buddyCheck = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        buddyCheck.setOwner(plainMemberUser);
        applicationRepository.save(buddyCheck);

        Application techno = applicationRepository.findById(seedIdentifiers.get(TECHNO)).get();
        techno.setOwner(userRepository.findBySubIgnoreCase(MANAGE_SUB).get());
        applicationRepository.save(techno);

        String guestMembershipIdentifier = OrganizationMembership.class.getName().concat(SHARE_LOGICS).concat(Authority.GUEST.name());
        OrganizationMembership guestMembership = organizationMembershipRepository.findById(seedIdentifiers.get(guestMembershipIdentifier)).get();
        ApplicationMembership guestOnTechno = applicationMembershipRepository.save(new ApplicationMembership(techno, guestMembership));

        String identifier = ApplicationMembership.class.getName().concat(BUDDY_CHECK).concat(Authority.MEMBER.name());
        ApplicationMembership guestOnBuddyCheck = applicationMembershipRepository.findById(seedIdentifiers.get(identifier)).get();

        AccessCookieFilter accessCookieFilter = mockLoginFlow(plainMemberSub);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("membership_id", guestOnBuddyCheck.getId())
                .delete("/api/v1/application_memberships/{membership_id}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

        assertFalse(applicationMembershipRepository.findById(guestOnBuddyCheck.getId()).isEmpty());
        assertFalse(applicationMembershipRepository.findById(guestOnTechno.getId()).isEmpty());
    }

    @Test
    void deleteGuestByMemberOwnerOfAllGuestApplicationsAllowed() {
        //Issue #992: a plain MEMBER who IS the creator of every application the guest is a member of may
        //remove the guest's access.
        String plainMemberSub = "urn:collab:person:example.com:plain_member_992_owner";
        User plainMemberUser = new User(false, plainMemberSub, plainMemberSub, "eduid.nl",
                "Plain", "Owner", "plain.owner.992@eduid.nl", "http://mock-idp");
        userRepository.save(plainMemberUser);
        Organization shareLogics = organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
        organizationMembershipRepository.save(new OrganizationMembership(plainMemberUser, shareLogics, Authority.MEMBER));

        Application buddyCheck = applicationRepository.findById(seedIdentifiers.get(BUDDY_CHECK)).get();
        buddyCheck.setOwner(plainMemberUser);
        applicationRepository.save(buddyCheck);

        String identifier = ApplicationMembership.class.getName().concat(BUDDY_CHECK).concat(Authority.MEMBER.name());
        ApplicationMembership guestOnBuddyCheck = applicationMembershipRepository.findById(seedIdentifiers.get(identifier)).get();

        AccessCookieFilter accessCookieFilter = mockLoginFlow(plainMemberSub);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(accessCookieFilter.csrfToken().getHeaderName(), accessCookieFilter.csrfToken().getToken())
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("membership_id", guestOnBuddyCheck.getId())
                .delete("/api/v1/application_memberships/{membership_id}")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());

        assertTrue(applicationMembershipRepository.findById(guestOnBuddyCheck.getId()).isEmpty());
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