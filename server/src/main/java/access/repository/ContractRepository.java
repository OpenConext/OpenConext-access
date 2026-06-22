package access.repository;

import access.model.Contract;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    Optional<Contract> findByOrganizationId(Long organizationId);

    @EntityGraph(attributePaths = {"organization"})
    List<Contract> findBySignedContractFalse();

}
