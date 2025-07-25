package access.repository;

import access.model.OrganizationMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, Long> {

}
