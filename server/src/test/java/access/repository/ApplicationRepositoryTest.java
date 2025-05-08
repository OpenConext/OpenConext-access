package access.repository;

import access.AbstractTest;
import access.model.Application;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ApplicationRepositoryTest extends AbstractTest {

    @Test
    void findAll() {
        List<Application> applications = super.applicationRepository.findAll();
        System.out.println(applications);
    }

}