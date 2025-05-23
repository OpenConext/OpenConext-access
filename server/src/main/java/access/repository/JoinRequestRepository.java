package access.repository;

import access.model.Application;
import access.model.JoinRequest;
import access.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {

    List<JoinRequest> findByOrganization(Organization organization);
}
