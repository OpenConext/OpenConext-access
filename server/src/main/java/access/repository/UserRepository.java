package access.repository;

import access.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {//, QueryRewriter {

    @EntityGraph(attributePaths = {
            "joinRequests.organization",
            "organizationMemberships.organization",
            "organizationMemberships.applicationMemberships.application"})
    Optional<User> findDetailsById(Long id);

    Optional<User> findBySubIgnoreCase(String sub);

    List<User> findBySuperUser(boolean isSuperUser);

    @Query(value = """
             SELECT u.id, u.name, u.email, u.schac_home_organization, u.super_user, u.institution_admin,
                u.created_at as createdAt, u.last_activity as lastActivity
              FROM users u WHERE MATCH (given_name, family_name, email, schac_home_organization) against (?1  IN BOOLEAN MODE)
            """,
            countQuery = "SELECT count(*) FROM users WHERE MATCH (given_name, family_name, email, schac_home_organization) against (?1  IN BOOLEAN MODE)",
            nativeQuery = true)
    Page<Map<String, Object>> searchByPageWithKeyword(String keyWord, Pageable pageable);

    @Query(value = """
             SELECT u.id, u.name, u.email, u.schac_home_organization, u.super_user, u.institution_admin,
                u.created_at as createdAt, u.last_activity as lastActivity
              FROM users u
            """,
            countQuery = "SELECT count(*) FROM users",
            nativeQuery = true)
    Page<Map<String, Object>> searchByPage(Pageable pageable);

    @Query("SELECT u FROM users u WHERE u.organizationMemberships IS NOT EMPTY AND (u.lastActivity IS NULL OR u.lastActivity < :cutoff)")
    List<User> findInactiveUsersWithMemberships(@Param("cutoff") Instant cutoff);

    @Query(value = """
            SELECT u.email, u.name
            FROM users u
            INNER JOIN organization_memberships om_admin
                ON om_admin.user_id = u.id
                AND om_admin.organization_id = :organizationId
                AND om_admin.authority = 'ADMIN'
            WHERE EXISTS (
                SELECT 1
                FROM organization_memberships om_member
                WHERE om_member.user_id = :userId
                  AND om_member.organization_id = :organizationId
            )
            LIMIT 1
            """, nativeQuery = true)
    Map<String, Object> findAdminByOrganizationAndMember(@Param("organizationId") Long organizationId,
                                                                   @Param("userId") Long userId);
}
