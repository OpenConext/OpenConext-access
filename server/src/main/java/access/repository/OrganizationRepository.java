package access.repository;

import access.model.Application;
import access.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {//, QueryRewriter {

    List<Organization> findByNameContainingIgnoreCase(String name);

    Optional<Organization> findBySchacHomeOrganizationIgnoreCase(String schacHomeOrganization);
}
