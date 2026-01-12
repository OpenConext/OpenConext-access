package access.api;

import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.mail.MailBox;
import access.manage.*;
import access.model.*;
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
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.manage.ManageData.*;

@RestController
@RequestMapping(value = {"/api/v1/idp"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
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
        LOG.debug("/connect SP to IdP connection for " + user.getEmail());

        String idpManageIdentifier = connectionRequest.getIdpManageIdentifier();
        Organization organization = organizationRepository.findByManageIdentifier(idpManageIdentifier)
                .orElseThrow(() -> new NotFoundException("Organization with manageIdentifier not found: " + idpManageIdentifier));

        Map<String, Object> serviceProvider = manage.providerById(connectionRequest.getEntityType(),
                connectionRequest.getApplicationManageIdentifier(), Environment.PROD);

        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, idpManageIdentifier, Environment.PROD);

        User userFromDB = reinitializeUser(user, userRepository);
        //See https://github.com/OpenConext/OpenConext-access/wiki/Service-Connect-Flow
        boolean memberRequest = !userFromDB.isSuperUser();
        if (memberRequest) {
            OrganizationMembership organizationMembership = getOrganizationMembership(userFromDB, organization, Authority.GUEST)
                    .orElseThrow(() -> new NotAllowedException(
                            String.format("User %s is not a member of organization %s", userFromDB.getEmail(), organization.getName())));
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
            mailBox.sendConnectionRequest(userFromDB, admins, organization, getProviderName(serviceProvider),
                    connectionRequest.getMessage(), deeplink);
            return Results.createResult();
        }
        //Now check if the connection can be made automatically
        Map<String, Object> spMetaDataFields = getMetaDataFields(getData(serviceProvider));
        DashBoardConnectionOption connectOption = DashBoardConnectionOption
                .fromValue((String) spMetaDataFields.getOrDefault("coin:dashboard_connect_option", "connect_with_interaction"));
        String idpInstitutionGUID = (String) getMetaDataFields(getData(identityProvider)).get("coin:institution_guid");

        boolean idpAndSpShareInstitution = spMetaDataFields.getOrDefault("coin:institution_guid", "nope")
                .equals(idpInstitutionGUID);
        boolean connectWithoutInteraction = idpAndSpShareInstitution || !connectOption.equals(DashBoardConnectionOption.connectWithInteraction);
        if (connectWithoutInteraction) {
                manage.connectWithoutInteraction(identityProvider, serviceProvider, userFromDB);
            if (connectOption.equals(DashBoardConnectionOption.connectWithoutInteractionWithEmail)) {
                List<String> recipients = contactPersons(serviceProvider);
                if (!CollectionUtils.isEmpty(recipients)) {
                    mailBox.sendNewConnectionCreated(
                            userFromDB,
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
                user.getEmail()
        ));
        ChangeRequest changeRequest = new ChangeRequest(
                idpManageIdentifier,
                EntityType.saml20_idp,
                Map.of("allowedEntities", Map.of("name", serviceProviderEntityID)),
                Map.of("user", user.getEmail(),
                        "notes", String.format("Connection request requested by %s from %s for %s. See Jira %s",
                                user.getName(),
                                identityProviderEntityID,
                                serviceProviderEntityID,
                                jiraKey)),
                true,
                PathUpdateType.ADDITION,
                RequestType.LinkRequest);
        manage.createChangeRequest(Environment.PROD, changeRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("status", HttpStatus.CREATED.value(), "jiraKey", jiraKey));
    }


}
