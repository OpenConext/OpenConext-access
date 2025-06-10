package access.api;

import access.config.HashGenerator;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.mail.MailBox;
import access.model.*;
import access.repository.*;
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
import java.util.stream.Collectors;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/invitations"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class InvitationController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(InvitationController.class);

    private final InvitationRepository invitationRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final ApplicationRepository applicationRepository;
    private final MailBox mailBox;

    public InvitationController(InvitationRepository invitationRepository,
                                OrganizationRepository organizationRepository,
                                OrganizationMembershipRepository organizationMembershipRepository,
                                ApplicationRepository applicationRepository,
                                MailBox mailBox) {
        this.invitationRepository = invitationRepository;
        this.organizationRepository = organizationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
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

    @PostMapping({"", "/"})
    public ResponseEntity<Invitation> create(User user, @Validated @RequestBody Invitation invitationData) {
        LOG.debug("/create invitation by " + user.getEmail());

        Long organizationID = invitationData.getOrganization().getId();
        Organization organization = organizationRepository.findById(organizationID)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        confirmOrganizationMembership(user, organization, Authority.ADMIN);
        Set<Application> applications = invitationData.getApplications();
        applications = applications.stream()
                .map(application -> this.applicationRepository.findById(application.getId())
                        .orElseThrow(() -> new NotFoundException("Application not found")))
                .collect(Collectors.toSet());
        if (!applications.stream().allMatch(application -> application.getOrganization().getId().equals(organizationID))) {
            throw new NotAllowedException("Not allowed to add application");
        }
        Invitation invitation = new Invitation(
                invitationData.getLanguage(),
                HashGenerator.generateRandomHash(),
                invitationData.getEmail(),
                invitationData.getMessage(),
                invitationData.getIntendedAuthority(),
                organization,
                user,
                applications
        );
        invitation = invitationRepository.save(invitation);
        mailBox.sendInviteMail(invitation);

        return ResponseEntity.status(HttpStatus.CREATED).body(invitation);
    }

    @PutMapping({"/accept"})
    public ResponseEntity<OrganizationMembership> accept(User user, @Validated @RequestBody AcceptInvitation acceptInvitation) {
        LOG.debug("/accept invitation by " + user.getEmail());

        Invitation invitation = invitationRepository.findByHash(acceptInvitation.hash())
                .orElseThrow(() -> new NotFoundException("Invitation not found"));
        invitation.accept();

        invitationRepository.save(invitation);
        //Now create organization_membership and - if any - applicationMemberships
        Organization organization = invitation.getOrganization();
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, invitation.getIntendedAuthority());


        List<ApplicationMembership> applicationMemberships = invitation.getApplications().stream()
                .map(application -> new ApplicationMembership(application, Authority.ADMIN))
                .toList();
//        applicationMemberships = applicationMembershipRepository.saveAll(applicationMemberships);
        applicationMemberships.forEach(applicationMembership -> organizationMembership.addApplicationMembership(applicationMembership));

        organization.addOrganizationMembership(organizationMembership);
        organizationRepository.save(organization);
//        organizationMembershipRepository.save(organizationMembership);

        return ResponseEntity.status(HttpStatus.CREATED).body(organizationMembership);
    }

}
