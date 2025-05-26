package access.api;

import access.exception.DuplicateJoinRequestException;
import access.exception.NotFoundException;
import access.model.JoinRequest;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.JoinRequestRepository;
import access.repository.OrganizationRepository;
import access.request.JoinRequestForm;
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
@RequestMapping(value = {"/api/v1/join"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class JoinRequestController {

    private static final Log LOG = LogFactory.getLog(JoinRequestController.class);

    private final JoinRequestRepository joinRequestRepository;
    private final OrganizationRepository organizationRepository;

    public JoinRequestController(JoinRequestRepository joinRequestRepository,
                                 OrganizationRepository organizationRepository) {
        this.joinRequestRepository = joinRequestRepository;
        this.organizationRepository = organizationRepository;
    }


    @GetMapping("/all/{organizationId}")
    public ResponseEntity<List<JoinRequest>> allByOrganization(@PathVariable("organizationId") Long id, User user) {
        LOG.debug("/all");

        Set<OrganizationMembership> organizationMemberships = user.getOrganizationMemberships();
        Organization organization = organizationMemberships.stream()
                .filter(membership -> membership.getOrganization().getId().equals(id))
                .map(membership -> membership.getOrganization())
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        List<JoinRequest> joinRequests = this.joinRequestRepository.findByOrganization(organization);
        return ResponseEntity.ok(joinRequests);
    }

    @PostMapping("/")
    public ResponseEntity<JoinRequest> create(User user, @RequestBody JoinRequestForm joinRequestForm) {
        LOG.debug("/create");

        Organization organization = this.organizationRepository.findById((Long) joinRequestForm.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        List<JoinRequest> joinRequests = joinRequestRepository.findByOrganization(organization);
        boolean force = joinRequestForm.isForce();
        if (!force && joinRequests.stream().anyMatch(jr -> jr.getUser().getId().equals(user.getId()))) {
            throw new DuplicateJoinRequestException(
                    String.format("Duplicate join request for user %s and organization %s",
                            user.getEmail(), organization.getName()));
        }
        JoinRequest joinRequest = new JoinRequest(user, organization, joinRequestForm.getLanguage());
        joinRequestRepository.save(joinRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(joinRequest);
    }

}
