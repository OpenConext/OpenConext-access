package access.repository;

import access.model.Application;
import access.model.ApplicationMembership;
import access.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationMembershipRepository extends JpaRepository<ApplicationMembership, Long> {

}
