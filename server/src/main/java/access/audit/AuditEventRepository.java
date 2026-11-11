package access.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {

    //The query is either null or a lowercase "%term%" pattern
    @Query("""
            SELECT e FROM audit_events e
            WHERE e.organizationId = :organizationId AND e.createdAt >= :from AND e.createdAt < :to
              AND (:actorId IS NULL OR e.actorUserId = :actorId)
              AND (:category IS NULL OR e.category = :category)
              AND (:query IS NULL OR LOWER(e.targetName) LIKE :query OR LOWER(e.actorName) LIKE :query)
            ORDER BY e.createdAt DESC, e.id DESC
            """)
    Page<AuditEvent> search(@Param("organizationId") Long organizationId,
                            @Param("from") Instant from,
                            @Param("to") Instant to,
                            @Param("actorId") Long actorId,
                            @Param("category") AuditCategory category,
                            @Param("query") String query,
                            Pageable pageable);

    @Query("""
            SELECT e.category, COUNT(e) FROM audit_events e
            WHERE e.organizationId = :organizationId AND e.createdAt >= :from AND e.createdAt < :to
            GROUP BY e.category
            """)
    List<Object[]> countByCategory(@Param("organizationId") Long organizationId,
                                   @Param("from") Instant from,
                                   @Param("to") Instant to);

    List<AuditEvent> findByOrganizationIdAndStatus(Long organizationId, AuditStatus status);

    long countByOrganizationIdAndStatus(Long organizationId, AuditStatus status);

    //Only the first caller moves an event out of PENDING, so a follow-up event is written exactly once
    @Modifying
    @Query("UPDATE audit_events e SET e.status = :status, e.resolvedAt = :resolvedAt WHERE e.id = :id AND e.status = access.audit.AuditStatus.PENDING")
    int resolve(@Param("id") Long id, @Param("status") AuditStatus status, @Param("resolvedAt") Instant resolvedAt);

    @Modifying
    @Query(value = "DELETE FROM audit_events WHERE organization_id = ?1 AND created_at < ?2 LIMIT 1000", nativeQuery = true)
    int purge(Long organizationId, Instant before);

    @Query("""
            SELECT DISTINCT e.actorUserId, e.actorName FROM audit_events e
            WHERE e.organizationId = :organizationId AND e.actorUserId IS NOT NULL
            ORDER BY e.actorName
            """)
    List<Object[]> actors(@Param("organizationId") Long organizationId);

}
