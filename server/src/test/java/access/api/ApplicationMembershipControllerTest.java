package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.*;
import access.request.ApplicationMembershipForm;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ApplicationMembershipControllerTest extends AbstractTest {

    @Test
    void allByOApplication() {
    }

    @Test
    void create() throws Exception {
        AccessCookieFilter accessCookieFilter = openIDConnectFlow("/api/v1/users/me", MANAGE_SUB);
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
}