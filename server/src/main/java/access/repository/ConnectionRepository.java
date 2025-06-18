package access.repository;

import access.model.Application;
import access.model.Connection;
import access.model.Organization;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {

    @EntityGraph(attributePaths = {"application.organization"})
    Optional<Connection> findDetailsById(Long id);

}
