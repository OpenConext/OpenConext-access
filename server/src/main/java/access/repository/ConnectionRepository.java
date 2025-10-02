package access.repository;

import access.model.Connection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {

    @EntityGraph(attributePaths = {"application.organization"})
    Optional<Connection> findDetailsById(Long id);

    @Modifying
    @Query(value = "DELETE FROM connections WHERE id = ?1", nativeQuery = true)
    @Transactional(isolation = Isolation.SERIALIZABLE)
    void deleteConnectionById(Long id);

}
