package access.audit;

import access.manage.Manage;
import access.manage.ManageData;
import access.model.Connection;
import access.model.EntityType;
import access.model.Organization;
import access.model.User;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Brings the audit events about Manage change requests up to date. Approval of a change request happens in Manage,
 * Access is never told. Instead of a job this is called when an admin looks at the audit log: events that are still
 * PENDING are compared with the change requests Manage reports as open. One that is gone was closed in Manage.
 */
@Component
public class ChangeRequestReconciler {

    private static final Log LOG = LogFactory.getLog(ChangeRequestReconciler.class);

    static final Duration MIN_INTERVAL = Duration.ofSeconds(30);
    static final Duration RETENTION = Duration.ofDays(2 * 365);

    private final AuditEventRepository auditEventRepository;
    private final Manage manage;
    private final Map<Long, Instant> lastReconciled = new ConcurrentHashMap<>();

    public ChangeRequestReconciler(AuditEventRepository auditEventRepository, Manage manage) {
        this.auditEventRepository = auditEventRepository;
        this.manage = manage;
    }

    /**
     * A new transaction, the audit log endpoints are read-only. Failures towards Manage are never propagated: the
     * events stay PENDING and are tried again the next time.
     *
     * @param force skip the minimal interval between two runs for the same organization
     * @return the number of events that were closed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int reconcile(Organization organization, boolean force) {
        Long organizationId = organization.getId();
        Instant now = Instant.now();
        Instant last = lastReconciled.get(organizationId);
        if (!force && last != null && Duration.between(last, now).compareTo(MIN_INTERVAL) < 0) {
            return 0;
        }
        lastReconciled.put(organizationId, now);
        try {
            auditEventRepository.purge(organizationId, now.minus(RETENTION));
        } catch (RuntimeException e) {
            LOG.warn("Could not purge the audit log of organization " + organizationId + ": " + e.getMessage());
        }
        List<AuditEvent> pending = auditEventRepository.findByOrganizationIdAndStatus(organizationId, AuditStatus.PENDING);
        if (pending.isEmpty()) {
            return 0;
        }
        int closed = 0;
        Map<String, List<AuditEvent>> byEntity = pending.stream()
                .filter(event -> event.getMetaDataId() != null && event.getEntityType() != null)
                .collect(Collectors.groupingBy(event -> event.getEntityType() + "/" + event.getMetaDataId()));
        for (List<AuditEvent> events : byEntity.values()) {
            AuditEvent first = events.get(0);
            List<Map<String, Object>> open;
            try {
                open = openChangeRequests(first);
            } catch (RuntimeException e) {
                LOG.warn(String.format("Could not fetch the change requests of %s %s: %s",
                        first.getEntityType(), first.getMetaDataId(), e.getMessage()));
                continue;
            }
            for (AuditEvent event : events) {
                if (open.stream().anyMatch(changeRequest -> isSame(event, changeRequest))) {
                    continue;
                }
                try {
                    if (close(event, outcome(event), null, true)) {
                        closed++;
                    }
                } catch (RuntimeException e) {
                    LOG.warn("Could not determine the outcome of change request " + event.getChangeRequestId()
                            + ": " + e.getMessage());
                }
            }
        }
        return closed;
    }

    /**
     * An outcome Access caused itself (reject or cancel), no need to look at Manage.
     */
    @Transactional
    public void closeLocally(User actor, Long organizationId, String changeRequestId, AuditStatus status) {
        if (changeRequestId == null) {
            return;
        }
        auditEventRepository.findByOrganizationIdAndStatus(organizationId, AuditStatus.PENDING).stream()
                .filter(event -> changeRequestId.equals(event.getChangeRequestId()))
                .forEach(event -> close(event, status, actor, false));
    }

    private boolean close(AuditEvent event, AuditStatus status, User actor, boolean detected) {
        Instant now = Instant.now();
        if (auditEventRepository.resolve(event.getId(), status, now) != 1) {
            return false;
        }
        AuditEvent followUp = new AuditEvent();
        followUp.setOrganizationId(event.getOrganizationId());
        followUp.setApplicationId(event.getApplicationId());
        if (actor != null) {
            followUp.setActorUserId(actor.getId());
            followUp.setActorName(actor.getName());
        }
        followUp.setCategory(AuditCategory.APPLICATION);
        followUp.setAction(switch (status) {
            case APPLIED -> AuditAction.CHANGE_REQUEST_APPLIED;
            case REJECTED -> AuditAction.CHANGE_REQUEST_REJECTED;
            case CANCELLED -> AuditAction.CHANGE_REQUEST_CANCELLED;
            default -> AuditAction.CHANGE_REQUEST_RESOLVED;
        });
        followUp.setTargetType(event.getTargetType());
        followUp.setTargetId(event.getTargetId());
        followUp.setTargetName(event.getTargetName());
        Map<String, Object> details = new HashMap<>();
        details.put("requestType", event.getRequestType());
        if (event.getDetails() != null && event.getDetails().get("ticketKey") != null) {
            details.put("ticketKey", event.getDetails().get("ticketKey"));
        }
        //Approval is not reported by Manage, the time is the moment we noticed
        if (detected) {
            details.put("detected", true);
        }
        followUp.setDetails(details);
        followUp.setChangeRequestId(event.getChangeRequestId());
        followUp.setRequestType(event.getRequestType());
        followUp.setMetaDataId(event.getMetaDataId());
        followUp.setEntityType(event.getEntityType());
        followUp.setStatus(status);
        followUp.setResolvedAt(now);
        auditEventRepository.save(followUp);
        return true;
    }

    private List<Map<String, Object>> openChangeRequests(AuditEvent event) {
        EntityType entityType = EntityType.valueOf(event.getEntityType());
        if (entityType == EntityType.saml20_idp) {
            return manage.getChangeRequestsIdentityProvider(Map.of("id", event.getMetaDataId()));
        }
        Connection connection = new Connection();
        connection.setProtocol(entityType);
        connection.setManageIdentifier(event.getMetaDataId());
        return manage.getChangeRequests(connection);
    }

    private boolean isSame(AuditEvent event, Map<String, Object> changeRequest) {
        if (event.getChangeRequestId() != null) {
            return event.getChangeRequestId().equals(changeRequest.get("id"));
        }
        //Manage did not return an id when the change request was created
        Map<String, Object> details = event.getDetails() != null ? event.getDetails() : Map.of();
        return Objects.equals(event.getRequestType(), changeRequest.get("requestType")) &&
                Objects.equals(details.get("pathUpdateType"), changeRequest.get("pathUpdateType")) &&
                Objects.equals(details.get("pathUpdates"), changeRequest.get("pathUpdates"));
    }

    @SuppressWarnings("unchecked")
    private AuditStatus outcome(AuditEvent event) {
        String requestType = event.getRequestType();
        Map<String, Object> details = event.getDetails() != null ? event.getDetails() : Map.of();
        EntityType entityType = EntityType.valueOf(event.getEntityType());
        if ("LinkRequest".equals(requestType) || "UnlinkRequest".equals(requestType)) {
            Map<String, Object> pathUpdates = (Map<String, Object>) details.getOrDefault("pathUpdates", Map.of());
            Map<String, Object> allowedEntity = (Map<String, Object>) pathUpdates.getOrDefault("allowedEntities", Map.of());
            Object entityId = allowedEntity.get("name");
            Map<String, Object> provider = manage.providerByManageIdentifier(entityType, event.getMetaDataId());
            List<Map<String, String>> allowedEntities = (List<Map<String, String>>) ManageData.getData(provider)
                    .getOrDefault("allowedEntities", List.of());
            boolean linked = allowedEntities.stream().anyMatch(entity -> Objects.equals(entityId, entity.get("name")));
            boolean addition = "ADDITION".equals(details.get("pathUpdateType"));
            return linked == addition ? AuditStatus.APPLIED : AuditStatus.REJECTED;
        }
        if ("ProductionStatusRequest".equals(requestType)) {
            Map<String, Object> provider = manage.providerByManageIdentifier(entityType, event.getMetaDataId());
            return "prodaccepted".equals(ManageData.getData(provider).get("state")) ?
                    AuditStatus.APPLIED : AuditStatus.REJECTED;
        }
        //The paths of other requests can not be compared reliably, so we do not guess
        return AuditStatus.RESOLVED;
    }

}
