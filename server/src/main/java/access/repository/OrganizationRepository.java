package access.repository;

import access.model.Organization;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {//, QueryRewriter {

    List<Organization> findByNameContainingIgnoreCase(String name);

    Optional<Organization> findBySchacHomeOrganization(String schacHomeOrganization);

    @EntityGraph(attributePaths = {
            "applications", "organizationMemberships.user", "invitations.invitee", "joinRequests.user"})
    Optional<Organization> findDetailsById(Long id);

    @EntityGraph(attributePaths = {"organizationMemberships.user"})
    Optional<Organization> findUsersById(Long id);

    @Modifying
    @Query(value = "DELETE FROM organizations WHERE id = ?1", nativeQuery = true)
    @Transactional(isolation = Isolation.SERIALIZABLE)
    void deleteOrganizationById(Long id);

}
