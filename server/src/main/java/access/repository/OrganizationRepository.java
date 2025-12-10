package access.repository;

import access.model.Organization;
import access.model.OrganizationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long>, QueryRewriter {

    List<Organization> findByNameContainingIgnoreCase(String name);

    Optional<Organization> findBySchacHomeOrganization(String schacHomeOrganization);

    List<Organization> findByStatus(OrganizationStatus status);

    @EntityGraph(attributePaths = {"organizationMemberships.user", "invitations.invitee", "joinRequests.user"})
    Optional<Organization> findUserManagementOrganizationById(Long id);

    @EntityGraph(attributePaths = {"applications.connections"})
    Optional<Organization> findApplicationsDetailsOrganizationById(Long id);

    @EntityGraph(attributePaths = {"organizationMemberships.user"})
    Optional<Organization> findUsersOfOrganizationById(Long id);

    @Modifying
    @Query(value = "DELETE FROM organizations WHERE id = ?1", nativeQuery = true)
    @Transactional(isolation = Isolation.SERIALIZABLE)
    void deleteOrganizationById(Long id);


    @Query(value = """
             SELECT org.id, org.name, org.schac_home_organization as schacHomeOrganization, org.status, org.created_at as createdAt,
                                org.manage_identifier as manageIdentifier,
                (SELECT COUNT(*) FROM organization_memberships om WHERE om.organization_id = org.id) as memberCount,
                (SELECT COUNT(*) FROM applications a WHERE a.organization_id = org.id) as applicationCount                        
              FROM organizations org WHERE MATCH (name, schac_home_organization) against (?1  IN BOOLEAN MODE)
            """,
            countQuery = "SELECT count(*) FROM organizations WHERE MATCH (name, schac_home_organization) against (?1  IN BOOLEAN MODE)",
            queryRewriter = OrganizationRepository.class,
            nativeQuery = true)
    Page<Map<String, Object>> searchByPageWithKeyword(String keyWord, Pageable pageable);

    @Query(value = """
             SELECT org.id, org.name, org.schac_home_organization as schacHomeOrganization, org.status, org.created_at as createdAt,
                                org.manage_identifier as manageIdentifier,
                (SELECT COUNT(*) FROM organization_memberships om WHERE om.organization_id = org.id) as memberCount,
                (SELECT COUNT(*) FROM applications a WHERE a.organization_id = org.id) as applicationCount                        
              FROM organizations org
            """,
            countQuery = "SELECT count(*) FROM organizations",
            queryRewriter = OrganizationRepository.class,
            nativeQuery = true)
    Page<Map<String, Object>> searchByPage(Pageable pageable);

    @Override
    default String rewrite(String query, Sort sort) {
        Sort.Order applicationCountSort = sort.getOrderFor("applicationCount");
        if (applicationCountSort != null) {
            //Spring cannot sort on aggregated columns
            return query.replace("order by org.applicationCount", "order by applicationCount");
        }
        Sort.Order memberCountSort = sort.getOrderFor("memberCount");
        if (memberCountSort != null) {
            //Spring cannot sort on aggregated columns
            return query.replace("order by org.memberCount", "order by memberCount");
        }
        return query;
    }

}
