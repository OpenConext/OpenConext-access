package access.repository;

import access.model.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {//, QueryRewriter {

    List<Organization> findByNameContainingIgnoreCase(String name);

    Optional<Organization> findBySchacHomeOrganization(String schacHomeOrganization);

    @EntityGraph(attributePaths = {
            "applications.connections", "organizationMemberships.user", "invitations.invitee", "joinRequests.user"})
    Optional<Organization> findDetailsById(Long id);

    @EntityGraph(attributePaths = {"organizationMemberships.user"})
    Optional<Organization> findUsersById(Long id);

    @Modifying
    @Query(value = "DELETE FROM organizations WHERE id = ?1", nativeQuery = true)
    @Transactional(isolation = Isolation.SERIALIZABLE)
    void deleteOrganizationById(Long id);

    @Query(value = """
             SELECT org.id, org.name, org.schac_home_organization, org.status, org.created_at
              FROM organizations org WHERE MATCH (name, schac_home_organization) against (?1  IN BOOLEAN MODE)
            """,
            countQuery = "SELECT count(*) FROM organizations WHERE MATCH (name, schac_home_organization) against (?1  IN BOOLEAN MODE)",
            nativeQuery = true)
    Page<Map<String, Object>> searchByPageWithKeyword(String keyWord, Pageable pageable);

}
