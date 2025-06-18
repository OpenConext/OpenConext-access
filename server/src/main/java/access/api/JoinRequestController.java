package access.api;

import access.exception.DuplicateJoinRequestException;
import access.exception.NotFoundException;
import access.mail.MailBox;
import access.model.*;
import access.repository.JoinRequestRepository;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import access.request.JoinRequestForm;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.persistence.EntityManager;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/join"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class JoinRequestController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(JoinRequestController.class);

    private final JoinRequestRepository joinRequestRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final MailBox mailBox;

    public JoinRequestController(JoinRequestRepository joinRequestRepository,
                                 OrganizationRepository organizationRepository,
                                 OrganizationMembershipRepository organizationMembershipRepository,
                                 MailBox mailBox) {
        this.joinRequestRepository = joinRequestRepository;
        this.organizationRepository = organizationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.mailBox = mailBox;
    }


    @GetMapping("/all/{organizationId}")
    public ResponseEntity<List<JoinRequest>> allByOrganization(@PathVariable("organizationId") Long organizationId, User user) {
        LOG.debug("/all");

        Organization organization = this.organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        confirmOrganizationMembership(user, organization, Authority.MEMBER);
        List<JoinRequest> joinRequests = this.joinRequestRepository.findByOrganization(organization);
        return ResponseEntity.ok(joinRequests);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<JoinRequest> create(User user, @RequestBody JoinRequestForm joinRequestForm) {
        LOG.debug("/create joinRequest by " + user.getEmail());

        Organization organization = this.organizationRepository.findById(joinRequestForm.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        List<JoinRequest> joinRequests = joinRequestRepository.findByOrganization(organization);
        boolean force = joinRequestForm.isForce();
        if (!force && joinRequests.stream().anyMatch(jr -> jr.getUser().getId().equals(user.getId()))) {
            throw new DuplicateJoinRequestException(
                    String.format("Duplicate join request for user %s and organization %s",
                            user.getEmail(), organization.getName()));
        }
        JoinRequest joinRequest = new JoinRequest(user, organization, joinRequestForm.getLanguage());
        joinRequest = joinRequestRepository.save(joinRequest);

        mailBox.sendJoinRequestMail(joinRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(joinRequest);
    }

    @PutMapping({"/accept/{joinRequestId}"})
    public ResponseEntity<Map<String, Integer>> accepts(User user, @PathVariable("joinRequestId") Long joinRequestId) {
        LOG.debug("/create joinRequest by " + user.getEmail());

        JoinRequest joinRequest = joinRequestRepository.findById(joinRequestId)
                .orElseThrow(() -> new NotFoundException("JoinRequest not found"));

        Organization organization = joinRequest.getOrganization();
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        OrganizationMembership organizationMembership = new OrganizationMembership(
                joinRequest.getUser(),organization, Authority.MEMBER);
        organizationMembershipRepository.save(organizationMembership);

        mailBox.sendJoinRequestAcceptedMail(joinRequest);

        organization.removeJoinRequest(joinRequest);
        joinRequestRepository.deleteJoinRequestById(joinRequestId);
        return Results.createResult();
    }
}
