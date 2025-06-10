package access.repository;

import access.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {//, QueryRewriter {

    @EntityGraph(attributePaths = {
            "joinRequests",
            "organizationMemberships.organization",
            "organizationMemberships.applicationMemberships.application"})
    Optional<User> findDetailsById(Long id);

    Optional<User> findBySubIgnoreCase(String sub);

}
