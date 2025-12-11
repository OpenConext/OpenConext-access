package access.repository;

import access.AbstractTest;
import access.model.Organization;
import access.model.OrganizationStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OrganizationRepositoryTest extends AbstractTest {

    @Test
    void findByNameContainingIgnoreCase() {
        List<Organization> organizations = super.organizationRepository.findByNameContainingIgnoreCase("LOGIC");
        assertEquals(1, organizations.size());
        Organization organization = organizations.getFirst();
        assertEquals(3, organization.getMemberCount());
    }

    @Test
    void findByStatus() {
        List<Organization> organizations = super.organizationRepository.findByStatus(OrganizationStatus.PENDING_APPROVAL);
        assertEquals(3, organizations.size());
    }
}