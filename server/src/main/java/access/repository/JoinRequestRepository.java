package access.repository;

import access.model.JoinRequest;
import access.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {

    List<JoinRequest> findByOrganization(Organization organization);

    @Modifying
    @Query(value = "DELETE FROM join_requests WHERE id = ?1", nativeQuery = true)
    @Transactional(isolation = Isolation.SERIALIZABLE)
    void deleteJoinRequestById(Long id);

}
