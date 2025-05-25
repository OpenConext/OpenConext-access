package access.repository;

import access.AbstractTest;
import access.model.Organization;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrganizationRepositoryTest extends AbstractTest {

    @Test
    void findByNameContainingIgnoreCase() {
        List<Organization> organizations = super.organizationRepository.findByNameContainingIgnoreCase("LOGIC");
        assertEquals(1, organizations.size());
        Organization organization = organizations.getFirst();
        assertEquals(1, organization.getMemberCount());
    }
}