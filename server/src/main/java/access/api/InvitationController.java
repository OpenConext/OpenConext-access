package access.api;

import access.config.HashGenerator;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.mail.MailBox;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.InvitationRepository;
import access.repository.OrganizationRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.*;

@RestController
@RequestMapping(value = {"/api/v1/invitations"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class InvitationController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(InvitationController.class);

    private final InvitationRepository invitationRepository;
    private final OrganizationRepository organizationRepository;
    private final ApplicationRepository applicationRepository;
    private final MailBox mailBox;

    public InvitationController(InvitationRepository invitationRepository,
                                OrganizationRepository organizationRepository,
                                ApplicationRepository applicationRepository,
                                MailBox mailBox) {
        this.invitationRepository = invitationRepository;
        this.organizationRepository = organizationRepository;
        this.applicationRepository = applicationRepository;
        this.mailBox = mailBox;
    }

    @GetMapping({"/all/{organizationId}"})
    public ResponseEntity<List<Invitation>> byOrganization(User user, @PathVariable("organizationId") Long organizationId) {
        LOG.debug("/by organization by " + user.getEmail());

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        confirmOrganizationMembership(user, organization, Authority.ADMIN);
        List<Invitation> invitations = invitationRepository.findByOrganization(organization);

        return ResponseEntity.status(HttpStatus.CREATED).body(invitations);
    }

    @GetMapping({"/hash"})
    public ResponseEntity<Invitation> byHash(User user, @RequestParam(value = "hash") String hash) {
        LOG.debug("/by hash by " + user.getEmail());

        Invitation invitation = invitationRepository.findDetailsByHash(hash).orElseThrow(() -> new NotFoundException("Invitation not found"));

        return ResponseEntity.ok(invitation);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Map<String, Integer>> create(User user, @RequestBody InvitationForm invitationForm) {
        LOG.debug("/create invitation by " + user.getEmail());

        Long organizationID = invitationForm.getOrganizationId();
        Organization organization = organizationRepository.findById(organizationID)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        Authority requiredAuthority = invitationForm.getIntendedAuthority().equals(Authority.ADMIN) ? Authority.ADMIN : Authority.MEMBER;
        confirmOrganizationMembership(user, organization, requiredAuthority);
        Set<Application> applications = invitationForm.getApplicationIdentifiers().stream()
                .map(applicationId -> this.applicationRepository.findById(applicationId)
                        .orElseThrow(() -> new NotFoundException("Application not found")))
                .collect(Collectors.toSet());
        if (!applications.stream().allMatch(application -> application.getOrganization().getId().equals(organizationID))) {
            throw new NotAllowedException("Not allowed to add application");
        }
        invitationForm.getInvites().forEach(invitee -> {
            Invitation invitation = new Invitation(
                    invitationForm.getLanguage(),
                    HashGenerator.generateRandomHash(),
                    invitee,
                    invitationForm.getMessage(),
                    invitationForm.getIntendedAuthority(),
                    organization,
                    user,
                    applications);
            invitation = invitationRepository.save(invitation);
            mailBox.sendInviteMail(invitation);
        });

        return createResult();
    }

    @PutMapping({"/accept"})
    public ResponseEntity<OrganizationMembership> accept(User user, @Validated @RequestBody AcceptInvitation acceptInvitation) {
        LOG.debug("/accept invitation by " + user.getEmail());

        Invitation invitation = invitationRepository.findByIdAndHash(acceptInvitation.invitationId(), acceptInvitation.hash())
                .orElseThrow(() -> new NotFoundException("Invitation not found"));
        invitation.accept();

        invitationRepository.save(invitation);
        //Now create organization_membership and - if any - applicationMemberships
        Organization organization = invitation.getOrganization();
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, invitation.getIntendedAuthority());


        List<ApplicationMembership> applicationMemberships = invitation.getApplications().stream()
                .map(application -> new ApplicationMembership(application, organizationMembership, Authority.ADMIN))
                .toList();
        applicationMemberships.forEach(applicationMembership -> organizationMembership.addApplicationMembership(applicationMembership));

        organization.addOrganizationMembership(organizationMembership);
        organizationRepository.save(organization);

        return ResponseEntity.status(HttpStatus.CREATED).body(organizationMembership);
    }

    @DeleteMapping({"/{invitationId}"})
    public ResponseEntity<Map<String, Integer>> deleteInvitation(User user, @PathVariable("invitationId") Long invitationId) {
        LOG.debug("/delete invitation by " + user.getEmail());

        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new NotFoundException("Invitation not found"));

        Organization organization = invitation.getOrganization();
        Authority requiredAuthority = invitation.getIntendedAuthority().equals(Authority.ADMIN) ? Authority.ADMIN : Authority.MEMBER;
        confirmOrganizationMembership(user, organization, requiredAuthority);

        invitationRepository.delete(invitation);

        return deleteResult();
    }

    @DeleteMapping({"/delete/all/{organizationId}"})
    public ResponseEntity<Map<String, Integer>> deleteAll(User user, @PathVariable("organizationId") Long organizationId) {
        LOG.debug("/delete all invitation by " + user.getEmail());

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        confirmOrganizationMembership(user, organization, Authority.ADMIN);
        Set<Invitation> invitations = organization.getInvitations();
        organization.getInvitations().clear();

        invitationRepository.deleteAll(invitations);

        return deleteResult();
    }

    @PutMapping({"/resend/{invitationId}"})
    public ResponseEntity<Map<String, Integer>> resendInvitation(User user, @PathVariable("invitationId") Long invitationId) {
        LOG.debug("/resend invitation by " + user.getEmail());

        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new NotFoundException("Invitation not found"));

        Organization organization = invitation.getOrganization();
        Authority requiredAuthority = invitation.getIntendedAuthority().equals(Authority.ADMIN) ? Authority.ADMIN : Authority.MEMBER;
        confirmOrganizationMembership(user, organization, requiredAuthority);
        invitation.setExpiryDate(Instant.now().plus(30, ChronoUnit.DAYS));
        invitationRepository.save(invitation);

        mailBox.sendInviteMail(invitation);

        return okResult();
    }
}
