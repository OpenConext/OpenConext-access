package access.repository;

import access.AbstractTest;
import access.model.Application;
import access.model.OrganizationMembership;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ApplicationRepositoryTest extends AbstractTest {

    @Test
    @Transactional
    void findAll() {
        Application application = super.applicationRepository.findAll()
                        .stream()
                                .filter(app -> app.getName().equalsIgnoreCase("BuddyCheck"))
                                        .findFirst().get();
        List<OrganizationMembership> organizationMemberships = application.getApplicationMemberships().stream()
                .map(am -> am.getOrganizationMemberships())
                .flatMap(Collection::stream)
                .toList();
        assertEquals(1, organizationMemberships.size());
    }

}