package access.repository;

import access.model.ApplicationMembership;
import access.model.OrganizationMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApplicationMembershipRepository extends JpaRepository<ApplicationMembership, Long> {

    long countByOrganizationMembership(OrganizationMembership organizationMembership);

}
