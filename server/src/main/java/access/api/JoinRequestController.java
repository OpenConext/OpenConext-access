package access.api;

import access.exception.NotFoundException;
import access.model.*;
import access.repository.JoinRequestRepository;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
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

    public JoinRequestController(JoinRequestRepository joinRequestRepository) {
        this.joinRequestRepository = joinRequestRepository;
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
    public ResponseEntity<Organization> create(User user, @RequestBody JoinRequest joinRequest) {
        LOG.debug("/create");

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

}
