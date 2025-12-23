package access.api;

import access.exception.InvalidInputException;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.manage.ChangeRequest;
import access.manage.Manage;
import access.manage.PathUpdateType;
import access.manage.RequestType;
import access.model.*;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;
import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

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

    public IdentityProviderController(UserRepository userRepository,
                                      OrganizationRepository organizationRepository,
                                      Manage manage,
                                      JiraClient jiraClient) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.manage = manage;
        this.jiraClient = jiraClient;
    }

    @PutMapping({"/connect"})
    public ResponseEntity<Map<String, Object>> connect(User user, @RequestBody @Validated ConnectionRequest connectionRequest) {
        LOG.debug("/connect SP to IdP connection for " + user.getEmail());

        Map<String, Object> serviceProvider = manage.providerById(connectionRequest.getEntityType(),
                connectionRequest.getApplicationManageIdentifier(), Environment.PROD);

        String idpManageIdentifier = connectionRequest.getIdpManageIdentifier();
        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, idpManageIdentifier, Environment.PROD);

        Organization organization = organizationRepository.findByManageIdentifier(idpManageIdentifier)
                .orElseThrow(() -> new NotFoundException("Organization with manageIdentifier not found: " + idpManageIdentifier));

        User userFromDB = reinitializeUser(user, userRepository);
        boolean memberRequest = !userFromDB.isSuperUser();
        if (memberRequest) {
            OrganizationMembership organizationMembership = getOrganizationMembership(userFromDB, organization, Authority.GUEST)
                    .orElseThrow(() -> new NotAllowedException(
                            String.format("User %s is not a member of organization %s", userFromDB.getEmail(), organization.getName())));
            memberRequest = !organizationMembership.getAuthority().equals(Authority.ADMIN);
        }
        if (memberRequest) {
            //The only action is to email the institution admin of the organization, with a deep link to App
            // TODO send email
            return Results.createResult();
        }

        String changeRequestURL = manage.changeRequestURL(EntityType.saml20_idp, idpManageIdentifier);

        String entityId = (String) ((Map) identityProvider.get("data")).get("entityid");
        String lineSeparator = System.lineSeparator();
        String summary = String.format("Connection request requested by %s for %s.",
                user.getName(), serviceProvider);
        String jiraKey = jiraClient.create(new JiraIssue(
                entityId,
                String.format("%s A change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        lineSeparator,
                        changeRequestURL),
                summary,
                EntityType.saml20_idp,
                user.getEmail()
        ));
        ChangeRequest changeRequest = new ChangeRequest(
                idpManageIdentifier,
                EntityType.saml20_idp,
                //TODO - See idp-dashboard
                Map.of("state", "prodaccepted"),
                Map.of("user", user.getEmail(),
                        "notes", String.format("Production status requested by %s for %s. See Jira %s",
                                user.getName(), connection.getName(), jiraKey)),
                false,
                PathUpdateType.ADDITION,
                RequestType.LinkRequest);
        Map<String, Object> changeRequestResponse = manage.createChangeRequest(connection.getEnvironment(), changeRequest);

        LOG.debug("Change request response from manage: " + changeRequestResponse);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("status", HttpStatus.CREATED.value(), "jiraKey", jiraKey));
    }

    @DeleteMapping({"", "/{connectionId}"})
    public ResponseEntity<Map<String, Object>> delete(User user, @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/delete connection by " + user.getEmail());

        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        if (StringUtils.hasText(connection.getManageIdentifier())) {
            manage.deleteProvider(connection);
        }
        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        Application application = connection.getApplication();
        application.removeConnection(connection);

        if (StringUtils.hasText(connection.getManageIdentifier())) {
            manage.deleteProvider(connection);
        }

        connectionRepository.deleteConnectionById(connectionId);

        return deleteResult();
    }

    @GetMapping("/identity-providers-allowed-connections/{connectionId}")
    public ResponseEntity<List<Map<String, Object>>> identityProvidersByAllowedConnections(User user,
                                                                                           @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/identityProvidersByAllowedConnections by: " + user.getEmail());
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        List<Map<String, Object>> identityProviders = manage.identityProvidersByAllowedConnections(List.of(connection));
        return ResponseEntity.ok(identityProviders);
    }


    @SuppressWarnings("unchecked")
    private Connection productionReadyChangeRequests(Connection connection, User user) {
        Environment environment = connection.getEnvironment();
        String changeRequestURL = manage.changeRequestURL(environment, connection);
        Map<String, Object> provider = manage.providerById(connection);
        connection.updateRemoteManageData(provider);

        String entityId = (String) ((Map) provider.get("data")).get("entityid");
        String summary = String.format("Data change requested by %s for %s with entityID %s",
                user.getName(),
                connection.getName(),
                entityId);
        String jiraKey = jiraClient.create(new JiraIssue(
                entityId,
                String.format("%s A change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        System.lineSeparator(),
                        changeRequestURL),
                summary,
                connection.getProtocol(),
                user.getEmail()
        ));
        Map<String, Object> auditData = Map.of("user", user.getEmail(),
                "notes", String.format("Production status requested by %s for %s. See Jira %s",
                        user.getName(), connection.getName(), jiraKey));
        List<ChangeRequest> changeRequests = connectionProviderConverter.deduceChangeRequests(connection, provider, auditData);
        changeRequests.forEach(changeRequest -> manage.createChangeRequest(environment, changeRequest));
        //Now the tricky bit, we must fetch the changeRequest after they are created and return the data based on the provider
        connection.mergeMetaData(provider, true);
        connection = connectionRepository.save(connection);
        connection.convertChangeRequests(manage.getChangeRequests(Environment.PROD, connection));
        return connection;
    }

    @SuppressWarnings("unchecked")
    private Connection saveConnection(Connection connection) {
        //Put / Post to Manage only if the status is not OPEN
        if (!connection.getStatus().equals(ConnectionStatus.OPEN)) {
            boolean isPrivateRelyingParty = connection.getProtocol().equals(EntityType.oidc10_rp) &&
                    connection.getMetaData().getOrDefault("pkce", false) == Boolean.FALSE;
            boolean hasSecret = StringUtils.hasText((String) connection.getMetaData().get("secret"));
            if (isPrivateRelyingParty && !hasSecret) {
                //generate secret but store the raw-text variant, because Manage encodes it
                String secret = passwordGenerator.generatePassword(SECRET_LENGTH, rules);
                connection.getMetaData().put("secret", secret);
                connection.setSecretSet(true);
            }
            //Now sync the Connection to Manage.
            Map<String, Object> provider = manage.saveProvider(connection);
            connection.updateRemoteManageData(provider);

            if (isPrivateRelyingParty) {
                //We must store the encrypted secret, otherwise manage will keep encrypting it again and again
                Map<String, Object> data = getData(provider);
                Map<String, Object> metaDataFields = getMetaDataFields(data);
                String secretFromManage = (String) metaDataFields.get("secret");
                if (StringUtils.hasText(secretFromManage) && secretFromManage.length() != SECRET_LENGTH) {
                    String originalSecret = (String) connection.getMetaData().get("secret");
                    connection.getMetaData().put("secret", secretFromManage);
                    if (originalSecret.length() == SECRET_LENGTH) {
                        connection.getMetaData().put("originalSecret", originalSecret);
                    }
                }
            }

            List<Map<String, Object>> contactPersons = (List<Map<String, Object>>) connection.getMetaData().get("contactPersons");
            if (!CollectionUtils.isEmpty(contactPersons)) {
                Application application = connection.getApplication();
                application.getMetaData().put("contactPersons", contactPersons);
                applicationRepository.save(application);
                //No need to store redundant data
                connection.getMetaData().remove("contactPersons");
            }
        }
        return connectionRepository.save(connection);
    }

    private Connection findConnectionForAuthorizedUser(User user, Long connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        user = this.reinitializeUser(user, userRepository);
        confirmApplicationWriteAccess(user, application);
        return connection;
    }


}
