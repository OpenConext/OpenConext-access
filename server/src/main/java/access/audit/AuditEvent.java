package access.audit;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.Map;

/**
 * Append-only record of an activity within an organization. Events are never updated and are removed together with
 * the organization (ON DELETE CASCADE).
 */
@Entity(name = "audit_events")
@NoArgsConstructor
@Getter
@Setter
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    //Denormalised, an actor can be removed. No actor means the system
    @Column(name = "actor_name")
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column
    private AuditCategory category;

    @Enumerated(EnumType.STRING)
    @Column
    private AuditAction action;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private String targetId;

    @Column(name = "target_name")
    private String targetName;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private Map<String, Object> details;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    //The fields below are only set for the events about a Manage change request
    @Column(name = "change_request_id")
    private String changeRequestId;

    @Enumerated(EnumType.STRING)
    @Column
    private AuditStatus status;

    @Column(name = "request_type")
    private String requestType;

    @Column(name = "meta_data_id")
    private String metaDataId;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

}
