package access.audit;

import access.AbstractTest;
import access.model.EntityType;
import access.model.Organization;
import access.model.User;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathMatching;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ChangeRequestReconcilerTest extends AbstractTest {

    //The IdP of ShareLogics in the static Manage data has a connection to this SP
    private static final String LINKED_SP = "https://wiki";

    @Autowired
    private ChangeRequestReconciler reconciler;

    private Organization organization() {
        return organizationRepository.findById(seedIdentifiers.get(SHARE_LOGICS)).get();
    }

    private AuditEvent pending(String changeRequestId, String requestType, String pathUpdateType, String spEntityId) {
        AuditEvent event = new AuditEvent();
        event.setOrganizationId(organization().getId());
        event.setCategory(AuditCategory.PENDING);
        event.setAction(AuditAction.CHANGE_REQUEST_SUBMITTED);
        event.setTargetName("Some app");
        event.setStatus(AuditStatus.PENDING);
        event.setChangeRequestId(changeRequestId);
        event.setRequestType(requestType);
        event.setMetaDataId(organization().getManageIdentifier());
        event.setEntityType(EntityType.saml20_idp.name());
        event.setDetails(Map.of("pathUpdateType", pathUpdateType,
                "pathUpdates", Map.of("allowedEntities", Map.of("name", spEntityId))));
        return auditEventRepository.save(event);
    }

    private void stubOpenChangeRequests(List<Map<String, Object>> changeRequests) {
        super.stubForGetChangeRequests(changeRequests);
        super.stubForGetProvider(EntityType.saml20_idp, organization().getManageIdentifier());
    }

    private AuditStatus status(AuditEvent event) {
        return auditEventRepository.findById(event.getId()).get().getStatus();
    }

    private long followUps(AuditAction action) {
        return auditEventRepository.findAll().stream().filter(event -> event.getAction().equals(action)).count();
    }

    @Test
    void stillOpenStaysPending() {
        AuditEvent event = pending("cr-1", "LinkRequest", "ADDITION", "https://new-sp");
        stubOpenChangeRequests(List.of(Map.of("id", "cr-1")));

        assertEquals(0, reconciler.reconcile(organization(), true));

        assertEquals(AuditStatus.PENDING, status(event));
        assertEquals(1, auditEventRepository.count());
    }

    @Test
    void closedLinkRequestWithLinkedServiceIsApplied() {
        AuditEvent event = pending("cr-1", "LinkRequest", "ADDITION", LINKED_SP);
        stubOpenChangeRequests(List.of());

        assertEquals(1, reconciler.reconcile(organization(), true));

        assertEquals(AuditStatus.APPLIED, status(event));
        assertEquals(1, followUps(AuditAction.CHANGE_REQUEST_APPLIED));
    }

    @Test
    void closedLinkRequestWithoutLinkIsRejected() {
        AuditEvent event = pending("cr-1", "LinkRequest", "ADDITION", "https://not-linked");
        stubOpenChangeRequests(List.of());

        reconciler.reconcile(organization(), true);

        assertEquals(AuditStatus.REJECTED, status(event));
        assertEquals(1, followUps(AuditAction.CHANGE_REQUEST_REJECTED));
    }

    @Test
    void closedUnlinkRequestWithoutLinkIsApplied() {
        AuditEvent event = pending("cr-1", "UnlinkRequest", "REMOVAL", "https://not-linked");
        stubOpenChangeRequests(List.of());

        reconciler.reconcile(organization(), true);

        assertEquals(AuditStatus.APPLIED, status(event));
    }

    @Test
    void outcomeOfOtherRequestTypesIsNotGuessed() {
        AuditEvent event = pending("cr-1", "Change", "ADDITION", "https://new-sp");
        stubOpenChangeRequests(List.of());

        reconciler.reconcile(organization(), true);

        assertEquals(AuditStatus.RESOLVED, status(event));
        assertEquals(1, followUps(AuditAction.CHANGE_REQUEST_RESOLVED));
    }

    @Test
    void matchesOnContentWhenManageReturnedNoId() {
        AuditEvent event = pending(null, "LinkRequest", "ADDITION", LINKED_SP);
        stubOpenChangeRequests(List.of(Map.of("requestType", "LinkRequest", "pathUpdateType", "ADDITION",
                "pathUpdates", Map.of("allowedEntities", Map.of("name", LINKED_SP)))));

        reconciler.reconcile(organization(), true);

        assertEquals(AuditStatus.PENDING, status(event));
    }

    @Test
    void secondRunIsNoOp() {
        pending("cr-1", "LinkRequest", "ADDITION", LINKED_SP);
        stubOpenChangeRequests(List.of());

        assertEquals(1, reconciler.reconcile(organization(), true));
        assertEquals(0, reconciler.reconcile(organization(), true));

        assertEquals(1, followUps(AuditAction.CHANGE_REQUEST_APPLIED));
    }

    @Test
    void minimalIntervalBetweenRuns() {
        pending("cr-1", "LinkRequest", "ADDITION", LINKED_SP);
        stubOpenChangeRequests(List.of(Map.of("id", "cr-1")));
        reconciler.reconcile(organization(), true);
        super.stubForGetChangeRequests(List.of());

        //Skipped, the previous run was just now
        assertEquals(0, reconciler.reconcile(organization(), false));
        assertEquals(1, reconciler.reconcile(organization(), true));
    }

    @Test
    void manageFailureKeepsEventPending() {
        AuditEvent event = pending("cr-1", "LinkRequest", "ADDITION", LINKED_SP);
        stubFor(get(urlPathMatching("/manage/api/internal/change-requests/.*"))
                .willReturn(aResponse().withStatus(500)));

        assertEquals(0, reconciler.reconcile(organization(), true));

        assertEquals(AuditStatus.PENDING, status(event));
    }

    @Test
    void noPendingEventsMeansNoManageCalls() {
        reconciler.reconcile(organization(), true);

        WireMock.verify(0, getRequestedFor(urlPathMatching("/manage/.*")));
    }

    @Test
    void closeLocallyRecordsTheActor() {
        AuditEvent event = pending("cr-1", "LinkRequest", "ADDITION", LINKED_SP);
        User actor = userRepository.findBySubIgnoreCase(MANAGE_SUB).get();

        reconciler.closeLocally(actor, organization().getId(), "cr-1", AuditStatus.CANCELLED);

        assertEquals(AuditStatus.CANCELLED, status(event));
        AuditEvent followUp = auditEventRepository.findAll().stream()
                .filter(e -> e.getAction().equals(AuditAction.CHANGE_REQUEST_CANCELLED)).findFirst().get();
        assertEquals(actor.getId(), followUp.getActorUserId());
    }

}
