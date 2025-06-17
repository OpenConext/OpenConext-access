package access.api;

import access.exception.NotFoundException;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
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
public class ApplicationController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(ApplicationController.class);

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public ApplicationController(ApplicationRepository applicationRepository,
                                 UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
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
        List<Application> applications = this.applicationRepository.findByOrganization(organization);
        return ResponseEntity.ok(applications);
    }

    @GetMapping({"/{applicationId}"})
    public ResponseEntity<Application> find(User user, @PathVariable("applicationId") Long applicationId) {
        LOG.debug("/find application for " + user.getEmail());

        Application application = applicationRepository.findDetailsById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));

        return ResponseEntity.ok(application);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Application> create(User user, @Validated @RequestBody Application application) {
        LOG.debug("/create application by " + user.getEmail());

        Organization organization = application.getOrganization();
        confirmOrganizationMembership(user, organization, Authority.MEMBER);
        applicationRepository.save(application);

        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Application> update(User user, @Validated @RequestBody Application applicationData) {
        LOG.debug("/update application by " + user.getEmail());

        Application application = applicationRepository.findById(applicationData.getId())
                .orElseThrow(() -> new NotFoundException("Application not found"));
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        application.merge(applicationData);
        applicationRepository.save(application);

        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    @DeleteMapping({"", "/{applicationId}"})
    public ResponseEntity<Void> delete(User user, @PathVariable("applicationId") Long applicationId) {
        LOG.debug("/delete application by " + user.getEmail());

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.ADMIN);

        applicationRepository.delete(application);

        return ResponseEntity.status(HttpStatus.OK).build();
    }
}
