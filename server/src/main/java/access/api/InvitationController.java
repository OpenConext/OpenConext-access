package access.api;

import access.config.HashGenerator;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.mail.MailBox;
import access.model.AcceptInvitation;
import access.model.Application;
import access.model.ApplicationMembership;
import access.model.Authority;
import access.model.Invitation;
import access.model.InvitationForm;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.ApplicationRepository;
import access.repository.InvitationRepository;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private final UserRepository userRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public InvitationController(InvitationRepository invitationRepository,
                                OrganizationRepository organizationRepository,
                                ApplicationRepository applicationRepository,
                                MailBox mailBox, UserRepository userRepository, OrganizationMembershipRepository organizationMembershipRepository) {
        this.invitationRepository = invitationRepository;
        this.organizationRepository = organizationRepository;
        this.applicationRepository = applicationRepository;
        this.mailBox = mailBox;
        this.userRepository = userRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
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
    public ResponseEntity<Map<String, Object>> create(User user, @RequestBody InvitationForm invitationForm) {
        LOG.debug("/create invitation by " + user.getEmail());

        Long organizationID = invitationForm.getOrganizationId();
        Organization organization = organizationRepository.findById(organizationID)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        boolean isGuestInvitation = invitationForm.getIntendedAuthority().equals(Authority.GUEST);

        User userFromDB = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, isGuestInvitation ? Authority.MEMBER : Authority.ADMIN);

        Set<Application> applications = invitationForm.getApplicationIdentifiers().stream()
                .map(applicationId -> this.applicationRepository.findById(applicationId)
                        .orElseThrow(() -> new NotFoundException("Application not found")))
                .collect(Collectors.toSet());
        if (!applications.stream().allMatch(application -> application.getOrganization().getId().equals(organizationID))) {
            throw new NotAllowedException("Not allowed to add applications outside the organization");
        }
        applications.forEach(application -> confirmApplicationWriteAccess(userFromDB, application, Authority.MEMBER));

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
    public ResponseEntity<Map<String, Object>> accept(User user, @Validated @RequestBody AcceptInvitation acceptInvitation) {
        LOG.debug("/accept invitation by " + user.getEmail());

        Invitation invitation = invitationRepository.findByIdAndHash(acceptInvitation.invitationId(), acceptInvitation.hash())
                .orElseThrow(() -> new NotFoundException("Invitation not found"));
        invitation.accept();

        user = reinitializeUser(user, userRepository);
        invitationRepository.save(invitation);
        Organization organization = invitation.getOrganization();
        //Internal users are already provisioned in their organization
        Optional<OrganizationMembership> organizationMembershipOptional = user.getOrganizationMemberships().stream()
                .filter(organizationMembership -> organizationMembership.getOrganization().getId().equals(organization.getId()))
                .findFirst();
        if (organizationMembershipOptional.isEmpty()) {
            //Now create organization_membership and - if any - applicationMemberships
            OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, invitation.getIntendedAuthority());
            List<ApplicationMembership> applicationMemberships = invitation.getApplications().stream()
                    .map(application -> new ApplicationMembership(application, organizationMembership))
                    .toList();
            applicationMemberships.forEach(organizationMembership::addApplicationMembership);
            organization.addOrganizationMembership(organizationMembership);
            organizationRepository.save(organization);
        } else {
            //Add missing applicationMemberships
            OrganizationMembership organizationMembership = organizationMembershipOptional.get();
            List<Long> applicationIdentifiers = organizationMembership.getApplicationMemberships().stream()
                    .map(applicationMembership -> applicationMembership.getApplication().getId())
                    .toList();
            List<ApplicationMembership> applicationMemberships = invitation.getApplications().stream()
                    .filter(application -> !applicationIdentifiers.contains(application.getId()))
                    .map(application -> new ApplicationMembership(application, organizationMembership))
                    .toList();
            applicationMemberships.forEach(organizationMembership::addApplicationMembership);
            organizationMembershipRepository.save(organizationMembership);
        }

        return createResult();
    }

    @DeleteMapping({"/{invitationId}"})
    public ResponseEntity<Map<String, Object>> deleteInvitation(User user, @PathVariable("invitationId") Long invitationId) {
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
    public ResponseEntity<Map<String, Object>> deleteAll(User user, @PathVariable("organizationId") Long organizationId) {
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
    public ResponseEntity<Map<String, Object>> resendInvitation(User user, @PathVariable("invitationId") Long invitationId) {
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
