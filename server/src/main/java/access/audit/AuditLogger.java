package access.audit;

import access.manage.ChangeRequest;
import access.model.Organization;
import access.model.User;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Records an {@link AuditEvent}. Call it from the controller within the transaction of the change itself, so an event
 * only exists when the change was committed.
 */
@Component
public class AuditLogger {

    private final AuditEventRepository auditEventRepository;

    public AuditLogger(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    /**
     * Builds the details of an event from key / value pairs, entries without a value are left out.
     */
    public static Map<String, Object> details(Object... keyValues) {
        Map<String, Object> details = new java.util.LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            if (keyValues[i + 1] != null) {
                details.put((String) keyValues[i], keyValues[i + 1]);
            }
        }
        return details;
    }

    public AuditEvent log(User actor,
                          Organization organization,
                          AuditCategory category,
                          AuditAction action,
                          String targetType,
                          Object targetId,
                          String targetName,
                          Map<String, Object> details) {
        return log(actor, organization, null, category, action, targetType, targetId, targetName, details);
    }

    /**
     * Records that Access created a change request in Manage. The event stays PENDING until the change request is
     * closed, see {@link ChangeRequestReconciler}.
     */
    public AuditEvent changeRequestSubmitted(User actor,
                                             Organization organization,
                                             Long applicationId,
                                             ChangeRequest changeRequest,
                                             Map<String, Object> manageResponse,
                                             String targetType,
                                             Object targetId,
                                             String targetName,
                                             Map<String, Object> details) {
        Map<String, Object> allDetails = details(
                "ticketKey", changeRequest.getTicketKey(),
                "pathUpdateType", changeRequest.getPathUpdateType() != null ? changeRequest.getPathUpdateType().name() : null,
                "pathUpdates", changeRequest.getPathUpdates());
        if (details != null) {
            allDetails.putAll(details);
        }
        AuditEvent event = new AuditEvent();
        event.setOrganizationId(organization.getId());
        event.setApplicationId(applicationId);
        if (actor != null) {
            event.setActorUserId(actor.getId());
            event.setActorName(actor.getName());
        }
        event.setCategory(AuditCategory.PENDING);
        event.setAction(AuditAction.CHANGE_REQUEST_SUBMITTED);
        event.setTargetType(targetType);
        event.setTargetId(targetId == null ? null : String.valueOf(targetId));
        event.setTargetName(targetName);
        event.setDetails(allDetails);
        event.setStatus(AuditStatus.PENDING);
        event.setChangeRequestId(manageResponse != null ? (String) manageResponse.get("id") : null);
        event.setRequestType(changeRequest.getRequestType() != null ? changeRequest.getRequestType().name() : null);
        event.setMetaDataId(changeRequest.getMetaDataId());
        event.setEntityType(changeRequest.getType());
        return auditEventRepository.save(event);
    }

    public AuditEvent log(User actor,
                          Organization organization,
                          Long applicationId,
                          AuditCategory category,
                          AuditAction action,
                          String targetType,
                          Object targetId,
                          String targetName,
                          Map<String, Object> details) {
        AuditEvent event = new AuditEvent();
        event.setOrganizationId(organization.getId());
        event.setApplicationId(applicationId);
        if (actor != null) {
            event.setActorUserId(actor.getId());
            event.setActorName(actor.getName());
        }
        event.setCategory(category);
        event.setAction(action);
        event.setTargetType(targetType);
        event.setTargetId(targetId == null ? null : String.valueOf(targetId));
        event.setTargetName(targetName);
        event.setDetails(details == null || details.isEmpty() ? null : details);
        return auditEventRepository.save(event);
    }

}
