package access.repository;

import access.model.Application;
import access.model.Organization;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {//, QueryRewriter {

    @EntityGraph(attributePaths = {
            "organization",
            "connections",
            "applicationMemberships.organizationMembership"
    })
    Optional<Application> findDetailsById(Long id);

    List<Application> findByOrganization(Organization organization);

    @Query(value = "SELECT app.id, app.name FROM applications app where app.organization_id = ?1",
            nativeQuery = true)
    List<Map<String, Object>> findAllLight(Long organizationId);

}
