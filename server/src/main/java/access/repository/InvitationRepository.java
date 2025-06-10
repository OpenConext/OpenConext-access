package access.repository;

import access.model.Invitation;
import access.model.Organization;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    @EntityGraph(attributePaths = {"invitee"})
    List<Invitation> findByOrganization(Organization organization);

    @EntityGraph(attributePaths = {"invitee"})
    Optional<Invitation> findByHash(String hash);

}
