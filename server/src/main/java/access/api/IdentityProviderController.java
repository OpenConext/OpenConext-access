package access.api;

import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.mail.MailBox;
import access.manage.ChangeRequest;
import access.manage.DashBoardConnectionOption;
import access.manage.Manage;
import access.manage.PathUpdateType;
import access.manage.RequestType;
import access.model.Authority;
import access.model.ConnectionRequest;
import access.model.EntityType;
import access.model.Environment;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.manage.ManageData.*;

@RestController
@RequestMapping(value = {"/api/v1/idp"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
@SuppressWarnings("unchecked")
public class IdentityProviderController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(IdentityProviderController.class);

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final Manage manage;
    private final JiraClient jiraClient;
    private final MailBox mailBox;

    public IdentityProviderController(UserRepository userRepository,
                                      OrganizationRepository organizationRepository,
                                      Manage manage,
                                      JiraClient jiraClient,
                                      MailBox mailBox) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.manage = manage;
        this.jiraClient = jiraClient;
        this.mailBox = mailBox;
    }

    @PutMapping({"/connect"})
    public ResponseEntity<Map<String, Object>> connect(User user, @RequestBody @Validated ConnectionRequest connectionRequest) {
        String email = user.getEmail();
        LOG.debug("/connect SP to IdP connection for " + email);

        user = reinitializeUser(user, userRepository);

        String idpManageIdentifier = connectionRequest.getIdpManageIdentifier();
        Organization organization = organizationRepository.findByManageIdentifier(idpManageIdentifier)
                .orElseThrow(() -> new NotFoundException("Organization with manageIdentifier not found: " + idpManageIdentifier));

        Map<String, Object> serviceProvider = manage.providerById(connectionRequest.getEntityType(),
                connectionRequest.getApplicationManageIdentifier(), Environment.PROD);

        boolean memberRequest = !user.isSuperUser();
        if (memberRequest) {
            OrganizationMembership organizationMembership = getOrganizationMembership(user, organization, Authority.GUEST)
                    .orElseThrow(() -> new NotAllowedException(
                            String.format("User %s is not a member of organization %s", email, organization.getName())));
            memberRequest = !organizationMembership.getAuthority().equals(Authority.ADMIN);
        }
        if (memberRequest) {
            //The only action is to email the institution admin of the organization, with a deep link to App
            List<User> admins = organization.getOrganizationMemberships().stream()
                    .filter(membership -> membership.getAuthority().equals(Authority.ADMIN))
                    .map(membership -> membership.getUser())
                    .toList();
            if (admins.isEmpty()) {
                //Edge case, send the mail to the superusers instead
                admins = userRepository.findBySuperUser(true);
            }
            String deeplink = String.format("/application-detail/%s/%s",
                    serviceProvider.get("type"),
                    serviceProvider.get("id"));
            //Avoid UnsupportedException for immutable collections
            admins = new ArrayList<>(admins);
            admins.add(user);
            mailBox.sendConnectionRequest(user, admins, organization, getProviderName(serviceProvider),
                    connectionRequest.getMessage(), deeplink);
            return Results.createResult();
        }

        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, idpManageIdentifier, Environment.PROD);

        //See https://github.com/OpenConext/OpenConext-access/wiki/Service-Connect-Flow
        //Now check if the connection can be made automatically
        Map<String, Object> spMetaDataFields = getMetaDataFields(getData(serviceProvider));
        DashBoardConnectionOption connectOption = DashBoardConnectionOption
                .fromValue((String) spMetaDataFields.getOrDefault("coin:dashboard_connect_option", "connect_with_interaction"));
        String idpInstitutionGUID = (String) getMetaDataFields(getData(identityProvider)).get("coin:institution_guid");

        boolean idpAndSpShareInstitution = spMetaDataFields.getOrDefault("coin:institution_guid", "nope")
                .equals(idpInstitutionGUID);
        boolean connectWithoutInteraction = idpAndSpShareInstitution || !connectOption.equals(DashBoardConnectionOption.connectWithInteraction);
        if (connectWithoutInteraction) {
            manage.connectWithoutInteraction(identityProvider, serviceProvider, user);
            if (connectOption.equals(DashBoardConnectionOption.connectWithoutInteractionWithEmail)) {
                List<String> recipients = contactPersons(serviceProvider);
                if (!CollectionUtils.isEmpty(recipients)) {
                    mailBox.sendNewConnectionCreated(
                            user,
                            recipients,
                            getProviderName(identityProvider),
                            getProviderName(serviceProvider),
                            (String) getData(serviceProvider).get("entityid"));
                }
            }
            return Results.createResult();
        }

        String changeRequestURL = manage.changeRequestURLConnectionRequest(EntityType.saml20_idp, idpManageIdentifier);

        String identityProviderEntityID = getEntityID(identityProvider);
        String serviceProviderEntityID = getEntityID(serviceProvider);
        String lineSeparator = System.lineSeparator();
        String summary = String.format("Connection request requested by %s for %s.",
                user.getName(), getProviderName(identityProvider));
        String jiraKey = jiraClient.create(new JiraIssue(
                serviceProviderEntityID,
                identityProviderEntityID,
                String.format("%s%sA change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        lineSeparator,
                        lineSeparator,
                        changeRequestURL),
                summary,
                EntityType.valueOf((String) serviceProvider.get("type")),
                email
        ));
        ChangeRequest changeRequest = new ChangeRequest(
                idpManageIdentifier,
                EntityType.saml20_idp,
                Map.of("allowedEntities", Map.of("name", serviceProviderEntityID)),
                Map.of("user", email,
                        "notes", String.format("Connection request requested by %s from %s for %s. See Jira %s",
                                user.getName(),
                                identityProviderEntityID,
                                serviceProviderEntityID,
                                jiraKey)),
                true,
                PathUpdateType.ADDITION,
                RequestType.LinkRequest,
                jiraKey);
        manage.createChangeRequest(Environment.PROD, changeRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("status", HttpStatus.CREATED.value(), "jiraKey", jiraKey));
    }

    @PutMapping({"/disconnect"})
    public ResponseEntity<Map<String, Object>> disconnect(User user, @RequestBody @Validated ConnectionRequest connectionRequest) {
        LOG.debug("/disconnect SP to IdP request by " + user.getEmail());

        user = reinitializeUser(user, userRepository);

        String idpManageIdentifier = connectionRequest.getIdpManageIdentifier();
        Organization organization = organizationRepository.findByManageIdentifier(idpManageIdentifier)
                .orElseThrow(() -> new NotFoundException("Organization with manageIdentifier not found: " + idpManageIdentifier));

        Map<String, Object> serviceProvider = manage.providerById(connectionRequest.getEntityType(),
                connectionRequest.getApplicationManageIdentifier(), Environment.PROD);

        confirmOrganizationMembership(user, organization, Authority.ADMIN);
        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, idpManageIdentifier, Environment.PROD);

        String changeRequestURL = manage.changeRequestURLConnectionRequest(EntityType.saml20_idp, idpManageIdentifier);

        String identityProviderEntityID = getEntityID(identityProvider);
        String serviceProviderEntityID = getEntityID(serviceProvider);
        String lineSeparator = System.lineSeparator();
        String summary = String.format("Disconnection request requested by %s for %s.",
                user.getName(), getProviderName(identityProvider));
        String jiraKey = jiraClient.create(new JiraIssue(
                serviceProviderEntityID,
                identityProviderEntityID,
                String.format("%s%sA change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        lineSeparator,
                        lineSeparator,
                        changeRequestURL),
                summary,
                EntityType.valueOf((String) serviceProvider.get("type")),
                user.getEmail()
        ));
        ChangeRequest changeRequest = new ChangeRequest(
                idpManageIdentifier,
                EntityType.saml20_idp,
                Map.of("allowedEntities", Map.of("name", serviceProviderEntityID)),
                Map.of("user", user.getEmail(),
                        "notes", String.format("Disconnection request requested by %s from %s for %s. See Jira %s",
                                user.getName(),
                                identityProviderEntityID,
                                serviceProviderEntityID,
                                jiraKey)),
                true,
                PathUpdateType.REMOVAL,
                RequestType.UnlinkRequest,
                jiraKey);
        manage.createChangeRequest(Environment.PROD, changeRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("status", HttpStatus.CREATED.value(), "jiraKey", jiraKey));
    }

    @PutMapping({"/cancel-connection-request"})
    public ResponseEntity<Map<String, Object>> cancelConnectionRequest(User user, @RequestBody @Validated ConnectionRequest connectionRequest) {
        LOG.debug("/cancelConnectionRequest SP to IdP request by " + user.getEmail());

        user = reinitializeUser(user, userRepository);

        String idpManageIdentifier = connectionRequest.getIdpManageIdentifier();
        Organization organization = organizationRepository.findByManageIdentifier(idpManageIdentifier)
                .orElseThrow(() -> new NotFoundException("Organization with manageIdentifier not found: " + idpManageIdentifier));

        Map<String, Object> serviceProvider = manage.providerById(connectionRequest.getEntityType(),
                connectionRequest.getApplicationManageIdentifier(), Environment.PROD);

        confirmOrganizationMembership(user, organization, Authority.ADMIN);
        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, idpManageIdentifier, Environment.PROD);

        List<Map<String, Object>> changeRequests = manage.getChangeRequestsIdentityProvider(identityProvider);
        String serviceProviderEntityID = getEntityID(serviceProvider);
        List<Map<String, Object>> openChangeRequests = changeRequests.stream()
                .filter(changeRequest ->
                        EntityType.saml20_idp.name().equals(changeRequest.get("type")) &&
                                PathUpdateType.ADDITION.name().equalsIgnoreCase((String) changeRequest.get("pathUpdateType")) &&
                                RequestType.LinkRequest.name().equalsIgnoreCase((String) changeRequest.get("requestType")) &&
                                serviceProviderEntityID.equals(((Map<String, Map<String, String>>)
                                        changeRequest.getOrDefault("pathUpdates", Map.of()))
                                        .getOrDefault("allowedEntities", Map.of()).get("name")))
                .toList();
        //First delete all manage change request - this is most likely to succeed
        openChangeRequests.forEach(changeRequest -> manage.rejectChangeRequest(Environment.PROD, new ChangeRequest(changeRequest)));
        //Then update all Jira comments, this API is not so stable
        String comment = "Ticket can be closed by request of the requestor";
        openChangeRequests.forEach(changeRequest -> jiraClient.comment((String) changeRequest.get("ticketKey"), comment));

        return Results.okResult();
    }
}
