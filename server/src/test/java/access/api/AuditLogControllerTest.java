package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.audit.AuditAction;
import access.audit.AuditCategory;
import access.audit.AuditEvent;
import access.audit.AuditStatus;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.http.HttpStatus;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuditLogControllerTest extends AbstractTest {

    private Long shareLogicsId() {
        return organizationRepository.findAll().stream()
                .filter(organization -> organization.getName().equals(SHARE_LOGICS)).findFirst().get().getId();
    }

    private void changeAuthorityOfMember(AccessCookieFilter accessCookieFilter) {
        Long membershipId = super.seedIdentifiers.get(OrganizationMembership.class.getName()
                .concat(SHARE_LOGICS).concat(Authority.MEMBER.name()));
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .body(Map.of("id", membershipId, "authority", Authority.GUEST.name()))
                .put("/api/v1/organization_memberships")
                .then()
                .statusCode(HttpStatus.OK.value());
    }

    @Test
    void mutationIsRecordedAndVisibleToAdmin() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        changeAuthorityOfMember(accessCookieFilter);

        Map<String, Object> page = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogicsId())
                .get("/api/v1/audit-log")
                .as(new TypeRef<>() {
                });
        List<Map<String, Object>> content = (List<Map<String, Object>>) page.get("content");
        assertEquals(1, content.size());
        Map<String, Object> event = content.get(0);
        assertEquals(AuditAction.MEMBER_AUTHORITY_CHANGED.name(), event.get("action"));
        assertEquals(AuditCategory.ORGANISATION.name(), event.get("category"));
        Map<String, Object> details = (Map<String, Object>) event.get("details");
        assertEquals("GUEST", details.get("to"));
        assertEquals(1, ((Number) page.get("totalElements")).intValue());
    }

    @Test
    void filtersCategoryAndQuery() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        changeAuthorityOfMember(accessCookieFilter);

        long applicationEvents = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogicsId())
                .queryParam("category", "APPLICATION")
                .get("/api/v1/audit-log")
                .then().extract().jsonPath().getLong("totalElements");
        assertEquals(0, applicationEvents);

        AuditEvent event = auditEventRepository.findAll().get(0);
        long byActor = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogicsId())
                .queryParam("actorId", event.getActorUserId())
                .queryParam("query", event.getTargetName().substring(0, 3).toUpperCase())
                .get("/api/v1/audit-log")
                .then().extract().jsonPath().getLong("totalElements");
        assertEquals(1, byActor);
    }

    @Test
    void summaryAndActors() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        changeAuthorityOfMember(accessCookieFilter);

        Map<String, Object> summary = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogicsId())
                .get("/api/v1/audit-log/summary")
                .as(new TypeRef<>() {
                });
        assertEquals(1, ((Number) summary.get("ORGANISATION")).intValue());
        assertEquals(0, ((Number) summary.get("APPLICATION")).intValue());

        List<Map<String, Object>> actors = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogicsId())
                .get("/api/v1/audit-log/actors")
                .as(new TypeRef<>() {
                });
        assertEquals(1, actors.size());
        assertTrue(actors.get(0).containsKey("name"));
    }

    @Test
    void guestIsForbidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(EXTERNAL_USER_SUB);
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogicsId())
                .get("/api/v1/audit-log")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void adminOfAnotherOrganizationIsForbidden() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long logistics = organizationRepository.findAll().stream()
                .filter(Organization -> Organization.getName().equals(LOGISTICS)).findFirst().get().getId();
        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", logistics)
                .get("/api/v1/audit-log")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void pendingChangeRequestsCountForTheSummary() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Organization shareLogics = organizationRepository.findById(shareLogicsId()).get();
        AuditEvent event = new AuditEvent();
        event.setOrganizationId(shareLogics.getId());
        event.setCategory(AuditCategory.PENDING);
        event.setAction(AuditAction.CHANGE_REQUEST_SUBMITTED);
        event.setStatus(AuditStatus.PENDING);
        event.setChangeRequestId("cr-1");
        event.setRequestType("LinkRequest");
        event.setMetaDataId(shareLogics.getManageIdentifier());
        event.setEntityType("saml20_idp");
        auditEventRepository.save(event);
        super.stubForGetChangeRequests(List.of(Map.of("id", "cr-1")));
        int joinRequests = joinRequestRepository.findByOrganization(shareLogics).size();

        Map<String, Object> summary = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", shareLogics.getId())
                .get("/api/v1/audit-log/summary")
                .as(new TypeRef<>() {
                });

        assertEquals(joinRequests + 1, ((Number) summary.get("PENDING")).intValue());
        assertEquals(AuditStatus.PENDING, auditEventRepository.findById(event.getId()).get().getStatus());
    }

    /**
     * Runs last, every test starts with a fresh seed. The events stay in the database afterwards, so the audit log can
     * be demoed as the admin of ShareLogics (mary.doe@example.com) once this test class has run.
     */
    @Test
    @Order(Integer.MAX_VALUE)
    void demoSeed() {
        Organization organization = organizationRepository.findAll().stream()
                .filter(org -> org.getName().equals(SHARE_LOGICS)).findFirst().get();
        List<AuditEvent> events = AuditLogDemoSeed.events(organization,
                userRepository.findBySubIgnoreCase(MANAGE_SUB).get(),
                userRepository.findBySubIgnoreCase(MULTIPLE_ORG_SUB).get(),
                userRepository.findBySubIgnoreCase(EXTERNAL_USER_SUB).get());
        auditEventRepository.saveAll(events);

        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        long total = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .accept(ContentType.JSON)
                .queryParam("organizationId", organization.getId())
                .queryParam("from", Instant.now().minus(Duration.ofDays(30)).toString())
                .get("/api/v1/audit-log")
                .then().extract().jsonPath().getLong("totalElements");
        assertEquals(events.size(), total);
    }

}
