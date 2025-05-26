package access.api;

import access.exception.NotFoundException;
import access.model.*;
import access.repository.ApplicationMembershipRepository;
import access.repository.ApplicationRepository;
import access.repository.OrganizationMembershipRepository;
import access.request.ApplicationMembershipForm;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/application_memberships"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class ApplicationMembershipController {

    private static final Log LOG = LogFactory.getLog(ApplicationMembershipController.class);

    private final ApplicationRepository applicationRepository;
    private final ApplicationMembershipRepository applicationMembershipRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public ApplicationMembershipController(ApplicationRepository applicationRepository, ApplicationMembershipRepository applicationMembershipRepository, OrganizationMembershipRepository organizationMembershipRepository) {
        this.applicationRepository = applicationRepository;
        this.applicationMembershipRepository = applicationMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @GetMapping("/all/{applicationId}")
    public ResponseEntity<Set<ApplicationMembership>> allByOApplication(
            @PathVariable("applicationId") Long applicationId, User user) {
        LOG.debug("/all");

        Application application = this.applicationRepository.findById(applicationId).orElseThrow(() -> new NotFoundException("Application not found"));
        Organization organization = application.getOrganization();
        Set<OrganizationMembership> organizationMemberships = user.getOrganizationMemberships();
        boolean isMemberOfOrganization = organizationMemberships.stream()
                .anyMatch(membership -> membership.getOrganization().getId().equals(organization.getId()));
        if (!isMemberOfOrganization) {
            throw new NotFoundException("Organization not found");
        }
        return ResponseEntity.ok(application.getApplicationMemberships());
    }

    @PostMapping({"", "/"})
    public ResponseEntity<ApplicationMembership> create(
            User user, @RequestBody ApplicationMembershipForm applicationMembershipForm) {
        LOG.debug("/create");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(applicationMembershipForm.getOrganizationMembershipId())
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));
        Application application = this.applicationRepository.findById(applicationMembershipForm.getApplicationId())
                .orElseThrow(() -> new NotFoundException("Application not found"));
        if (!application.getOrganization().getId().equals(organizationMembership.getOrganization().getId())) {
            throw new NotFoundException("Organization not found");
        }
        ApplicationMembership applicationMembership = new ApplicationMembership(application, Authority.MEMBER);
        applicationMembership = applicationMembershipRepository.save(applicationMembership);
        //Now fill the join table
        organizationMembership.addApplicationMembership(applicationMembership);
        organizationMembershipRepository.save(organizationMembership);

        return ResponseEntity.status(HttpStatus.CREATED).body(applicationMembership);
    }

}
