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

    Optional<Invitation> findByIdAndHash(Long id, String hash);

    @EntityGraph(attributePaths = {"invitee", "organization"})
    Optional<Invitation> findDetailsByHash(String hash);
}
