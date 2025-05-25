package access.api;

import access.exception.NotFoundException;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.JoinRequestRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/applications"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class ApplicationController {

    private static final Log LOG = LogFactory.getLog(ApplicationController.class);

    private final ApplicationRepository applicationRepository;

    public ApplicationController(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }


    @GetMapping("/all/{organizationId}")
    public ResponseEntity<List<Application>> allByOrganization(@PathVariable("organizationId") Long id, User user) {
        LOG.debug("/all");

        Set<OrganizationMembership> organizationMemberships = user.getOrganizationMemberships();
        Organization organization = organizationMemberships.stream()
                .filter(membership -> membership.getOrganization().getId().equals(id))
                .map(membership -> membership.getOrganization())
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        List<Application> joinRequests = this.applicationRepository.findByOrganization(organization);
        return ResponseEntity.ok(joinRequests);
    }

    @PostMapping("/")
    public ResponseEntity<Application> create(User user, @RequestBody Application application) {
        LOG.debug("/create");

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

}
