package access.api;

import access.audit.AuditAction;
import access.audit.AuditCategory;
import access.audit.AuditStatus;
import access.audit.AuditEvent;
import access.model.Organization;
import access.model.User;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static access.audit.AuditAction.*;
import static access.audit.AuditCategory.*;

/**
 * Meaningful audit events for demo purposes. Only used by {@link AuditLogControllerTest#demoSeed()}: the test database
 * keeps the events after that test, so the audit log page can be demoed on the seeded organization.
 */
final class AuditLogDemoSeed {

    private final Organization organization;
    private final User admin;
    private final User manager;
    private final User member;
    private final List<AuditEvent> events = new ArrayList<>();

    private AuditLogDemoSeed(Organization organization, User admin, User manager, User member) {
        this.organization = organization;
        this.admin = admin;
        this.manager = manager;
        this.member = member;
    }

    static List<AuditEvent> events(Organization organization, User admin, User manager, User member) {
        return new AuditLogDemoSeed(organization, admin, manager, member).build();
    }

    private List<AuditEvent> build() {
        //Today
        event(manager, Duration.ofMinutes(20), APPLICATION, APPLICATION_CONNECTED, "application", "Canvas LMS", null);
        event(admin, Duration.ofMinutes(75), APPLICATION, APPLICATION_MEMBER_ADDED, "user", "Sanne Visser",
                Map.of("application", "Canvas LMS"));
        event(admin, Duration.ofHours(2), ACCESS, POLICY_UPDATED, "policy", "Alleen medewerkers voor Zoom", null);
        event(manager, Duration.ofHours(3), ACCESS, ASSURANCE_UPDATED, "application", "Osiris",
                Map.of("field", "stepup", "from", "none", "to", "LoA 2"));
        //Change requests, without a Manage identifier so the demo ones are never reconciled
        changeRequest(manager, Duration.ofMinutes(45), "Zoom", AuditStatus.PENDING, AuditAction.CHANGE_REQUEST_SUBMITTED,
                "LinkRequest", AuditCategory.PENDING);
        changeRequest(admin, Duration.ofDays(1).plusHours(6), "Osiris", AuditStatus.APPLIED, AuditAction.CHANGE_REQUEST_SUBMITTED,
                "ProductionStatusRequest", AuditCategory.PENDING);
        changeRequest(null, Duration.ofDays(1).plusHours(2).plusMinutes(30), "Osiris", AuditStatus.APPLIED,
                AuditAction.CHANGE_REQUEST_APPLIED, "ProductionStatusRequest", AuditCategory.APPLICATION);
        //Yesterday
        event(admin, Duration.ofDays(1).plusHours(1), ACCESS, CONSENT_UPDATED, "application", "Miro", null);
        event(manager, Duration.ofDays(1).plusHours(2), ORGANISATION, MEMBER_AUTHORITY_CHANGED, "user", "Sanne Visser",
                Map.of("from", "MEMBER", "to", "ADMIN"));
        event(admin, Duration.ofDays(1).plusHours(3), APPLICATION, CONNECTION_UPDATED, "application", "Brightspace",
                Map.of("field", "eduIdAccess", "from", false, "to", true, "connection", "Brightspace", "protocol", "saml20_sp"));
        event(member, Duration.ofDays(1).plusHours(4), ORGANISATION, INVITATION_ACCEPTED, "user", "Lisa Jansen",
                Map.of("authority", "MEMBER"));
        event(manager, Duration.ofDays(1).plusHours(5), PENDING, JOIN_REQUEST_CREATED, "user", "Sam Jansen", null);
        //Earlier this week
        event(admin, Duration.ofDays(2).plusHours(1), APPLICATION, APPLICATION_DISCONNECTED, "application", "Mentimeter", null);
        event(manager, Duration.ofDays(2).plusHours(2), ORGANISATION, INVITATION_SENT, "invitation", "lisa.jansen@example.org",
                Map.of("authority", "MEMBER"));
        event(admin, Duration.ofDays(2).plusHours(4), ORGANISATION, ORGANISATION_UPDATED, "organization", "ShareLogics",
                Map.of("field", "name", "from", "Share Logics", "to", "ShareLogics"));
        event(manager, Duration.ofDays(3).plusHours(1), APPLICATION, APPLICATION_CREATED, "application", "Brightspace", null);
        event(manager, Duration.ofDays(3).plusHours(2), APPLICATION, CONNECTION_CREATED, "application", "Brightspace",
                Map.of("connection", "Brightspace", "protocol", "saml20_sp"));
        event(manager, Duration.ofDays(3).plusHours(3), APPLICATION, PRODUCTION_REQUESTED, "application", "Brightspace",
                Map.of("jiraKey", "ACC-1234"));
        event(admin, Duration.ofDays(3).plusHours(5), ACCESS, POLICY_CREATED, "policy", "Studenten naar Zoom", null);
        event(admin, Duration.ofDays(4).plusHours(1), ORGANISATION, JOIN_REQUEST_APPROVED, "user", "Pieter Bakker", null);
        event(admin, Duration.ofDays(4).plusHours(2), ORGANISATION, INVITATION_RESENT, "invitation", "jan.devries@example.org", null);
        event(manager, Duration.ofDays(4).plusHours(6), APPLICATION, CONNECTION_SECRET_RESET, "application", "Canvas LMS",
                Map.of("connection", "Canvas LMS", "protocol", "oidc10_rp"));
        event(admin, Duration.ofDays(5).plusHours(1), ACCESS, POLICY_DELETED, "policy", "Test regel", null);
        event(manager, Duration.ofDays(5).plusHours(3), ORGANISATION, MEMBER_REMOVED, "user", "Oud Medewerker",
                Map.of("authority", "MEMBER"));
        event(admin, Duration.ofDays(5).plusHours(4), ACCESS, ASSURANCE_UPDATED, "application", "Osiris",
                Map.of("field", "mfa", "from", "none", "to", "https://refeds.org/profile/mfa"));
        event(admin, Duration.ofDays(6).plusHours(1), ORGANISATION, JOIN_REQUEST_DENIED, "user", "Onbekende Gebruiker", null);
        event(manager, Duration.ofDays(6).plusHours(2), ORGANISATION, CONTRACT_REQUESTED, "contract", "ShareLogics", null);
        event(admin, Duration.ofDays(6).plusHours(5), APPLICATION, APPLICATION_MEMBER_REMOVED, "user", "Sanne Visser",
                Map.of("application", "Mentimeter"));
        //Older than a week, together with the rest more than one page of events
        event(manager, Duration.ofDays(8).plusHours(1), ORGANISATION, ORGANISATION_METADATA_UPDATED, "organization", "ShareLogics", null);
        event(admin, Duration.ofDays(8).plusHours(3), ORGANISATION, INVITATION_DELETED, "invitation", "oude.uitnodiging@example.org", null);
        event(manager, Duration.ofDays(9).plusHours(2), APPLICATION, APPLICATION_UPDATED, "application", "Canvas LMS", null);
        event(admin, Duration.ofDays(9).plusHours(4), APPLICATION, CONNECTION_DELETED, "application", "Mentimeter",
                Map.of("connection", "Mentimeter", "protocol", "saml20_sp"));
        event(manager, Duration.ofDays(10).plusHours(1), APPLICATION, APPLICATION_DELETED, "application", "Oude test-app", null);
        event(admin, Duration.ofDays(11).plusHours(2), ORGANISATION, CONTRACT_UPDATED, "contract", "ShareLogics", null);
        event(manager, Duration.ofDays(12).plusHours(2), APPLICATION, APPLICATION_CONNECTED, "application", "Mentimeter", null);
        return events;
    }

    private void changeRequest(User actor, Duration ago, String targetName, AuditStatus status, AuditAction action,
                               String requestType, AuditCategory category) {
        event(actor, ago, category, action, "application", targetName, Map.of("ticketKey", "ACC-4321"));
        AuditEvent event = events.get(events.size() - 1);
        event.setStatus(status);
        event.setRequestType(requestType);
        event.setChangeRequestId("demo-" + targetName);
        if (actor == null) {
            event.setActorUserId(null);
            event.setActorName(null);
        }
    }

    private void event(User actor, Duration ago, AuditCategory category, AuditAction action, String targetType,
                       String targetName, Map<String, Object> details) {
        AuditEvent event = new AuditEvent();
        event.setOrganizationId(organization.getId());
        if (actor != null) {
            event.setActorUserId(actor.getId());
            event.setActorName(actor.getName());
        }
        event.setCategory(category);
        event.setAction(action);
        event.setTargetType(targetType);
        event.setTargetName(targetName);
        event.setDetails(details);
        event.setCreatedAt(Instant.now().minus(ago));
        events.add(event);
    }

}
