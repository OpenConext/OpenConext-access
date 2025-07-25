package access.repository;

import access.model.Application;
import access.model.Organization;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
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
}
