package access.api;

import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.manage.ChangeRequest;
import access.manage.ConnectionProviderConverter;
import access.manage.Manage;
import access.manage.PathUpdateType;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.ConnectionRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.passay.CharacterRule;
import org.passay.EnglishCharacterData;
import org.passay.PasswordGenerator;
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

@RestController
@RequestMapping(value = {"/api/v1/connections"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class ConnectionController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(ConnectionController.class);
    private static final int SECRET_LENGTH = 36;

    private final ConnectionRepository connectionRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final Manage manage;
    private final JiraClient jiraClient;
    private final PasswordGenerator passwordGenerator = new PasswordGenerator();
    private final ConnectionProviderConverter converter;
    private final List<CharacterRule> rules = initPasswordGeneratorRules();
    private final ConnectionProviderConverter connectionProviderConverter;

    public ConnectionController(ConnectionRepository connectionRepository,
                                ApplicationRepository applicationRepository,
                                UserRepository userRepository,
                                Manage manage,
                                JiraClient jiraClient,
                                ConnectionProviderConverter converter, ConnectionProviderConverter connectionProviderConverter) {
        this.connectionRepository = connectionRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.manage = manage;
        this.jiraClient = jiraClient;
        this.converter = converter;
        this.connectionProviderConverter = connectionProviderConverter;
    }

    private List<CharacterRule> initPasswordGeneratorRules() {
        return List.of(
                new CharacterRule(EnglishCharacterData.LowerCase, 8),
                new CharacterRule(EnglishCharacterData.UpperCase, 8),
                new CharacterRule(EnglishCharacterData.Digit, 8));
    }

    @GetMapping({"/{connectionId}"})
    public ResponseEntity<Connection> find(User user, @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/find connection for " + user.getEmail());

        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        if (StringUtils.hasText(connection.getManageIdentifier())) {
            Map<String, Object> provider = manage.providerById(connection);
            if (connection.mergeMetaData(provider)) {
                connectionRepository.save(connection);
            }
        }
        return ResponseEntity.ok(connection);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Connection> create(User user, @Validated @RequestBody Connection connection) {
        LOG.debug("/create connection by " + user.getEmail());
        if (!connection.isValid()) {
            throw new InvalidInputException("Connection is not valid");
        }

        Long applicationID = connection.getApplication().getId();
        Application application = applicationRepository.findById(applicationID)
                .orElseThrow(() -> new NotFoundException("Application not found"));

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, application.getOrganization(), application, Authority.MEMBER);

        connection.setCreatedAt(Instant.now());
        connection.setApplication(application);
        connection = saveConnection(connection);

        return ResponseEntity.status(HttpStatus.CREATED).body(connection);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Connection> update(User user, @Validated @RequestBody Connection connectionData) {
        LOG.debug("/update connection by " + user.getEmail());
        if (!connectionData.isValid()) {
            throw new InvalidInputException("Connection is not valid");
        }
        Connection connection = findConnectionForAuthorizedUser(user, connectionData.getId());

        connection.merge(connectionData);

        if (connection.changeRequestRequired()) {
            //Not allowed to sync the connection to Manage. Create ChangeRequests
            connection = this.productionReadyChangeRequests(connection, user);
        } else {
            connection = saveConnection(connection);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(connection);
    }

    @SneakyThrows
    @GetMapping(value = "/change-requests/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> changeRequests(User user, @PathVariable("connectionId") Long connectionId) {
        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        List<Map<String, Object>> changeRequests = manage.getChangeRequests(connection.getEnvironment(), connection);
        return ResponseEntity.ok(changeRequests);
    }

    @PutMapping(value = "/reset-secret/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> secret(User user, @PathVariable("connectionId") Long connectionId) {
        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        String secret = passwordGenerator.generatePassword(SECRET_LENGTH, rules);
        connection.getMetaData().put("secret", secret);
        saveConnection(connection);

        return Collections.singletonMap("secret", secret);
    }

    @PutMapping(value = "/request-production-status/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> requestProductionStatus(User user,
                                                                       @PathVariable("connectionId") Long connectionId) {
        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        String changeRequestURL = manage.changeRequestURL(connection.getEnvironment(), connection);

        Map<String, Object> provider = manage.providerById(connection);
        String entityId = (String) ((Map) provider.get("data")).get("entityid");
        String lineSeparator = System.lineSeparator();
        String summary = String.format("Production status requested by %s for %s.",
                user.getName(), connection.getName());
        String jiraKey = jiraClient.create(new JiraIssue(
                entityId,
                String.format("%s A change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        lineSeparator,
                        changeRequestURL),
                summary,
                connection.getProtocol(),
                user.getEmail()
        ));
        ChangeRequest changeRequest = new ChangeRequest(
                connection.getManageIdentifier(),
                connection.getProtocol(),
                Map.of("state", "prodaccepted"),
                Map.of("user", user.getEmail(),
                        "notes", String.format("Production status requested by %s for %s. See Jira %s",
                                user.getName(), connection.getName(), jiraKey)),
                false,
                PathUpdateType.ADDITION);
        Map<String, Object> changeRequestResponse = manage.createChangeRequest(connection.getEnvironment(), changeRequest);

        LOG.debug("Change request response from manage: " + changeRequestResponse);

        connection.setStatus(ConnectionStatus.PENDING_PROD);
        saveConnection(connection);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("status", HttpStatus.CREATED.value(), "jiraKey", jiraKey));
    }

    @DeleteMapping({"", "/{connectionId}"})
    public ResponseEntity<Map<String, Integer>> delete(User user, @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/delete connection by " + user.getEmail());

        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        if (StringUtils.hasText(connection.getManageIdentifier())) {
            manage.deleteProvider(connection);
        }
        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        Application application = connection.getApplication();
        application.removeConnection(connection);

        connectionRepository.deleteById(connectionId);

        return deleteResult();
    }

    @SuppressWarnings("unchecked")
    private Connection productionReadyChangeRequests(Connection connection, User user) {
        Environment environment = connection.getEnvironment();
        String changeRequestURL = manage.changeRequestURL(environment, connection);
        Map<String, Object> provider = manage.providerById(connection);
        connection.updateRemoteManageData(provider);
        connection = connectionRepository.save(connection);

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
        return connection;
    }

    @SuppressWarnings("unchecked")
    private Connection saveConnection(Connection connection) {
        //Put / Post to Manage only if the status is not OPEN
        if (!connection.getStatus().equals(ConnectionStatus.OPEN)) {
            boolean isPublicRelyingParty = connection.getProtocol().equals(EntityType.oidc10_rp) &&
                    connection.getMetaData().getOrDefault("pkce", false) == Boolean.FALSE;
            boolean hasSecret = StringUtils.hasText((String) connection.getMetaData().get("secret"));
            if (isPublicRelyingParty && !hasSecret) {
                //generate secret but store the raw-text variant, because Manage encodes it
                String secret = passwordGenerator.generatePassword(SECRET_LENGTH, rules);
                connection.getMetaData().put("secret", secret);
                connection.setSecretSet(true);
            }
            //Now sync the Connection to Manage.
            Map<String, Object> provider = manage.saveProvider(connection);
            connection.updateRemoteManageData(provider);

            if (isPublicRelyingParty) {
                //We must store the encrypted secret, otherwise manage will keep encrypting it again and again
                Map<String, Object> data = (Map<String, Object>) provider.get("data");
                Map<String, Object> metaDataFields = (Map<String, Object>) data.get("metaDataFields");
                String secretFromManage = (String) metaDataFields.get("secret");
                if (StringUtils.hasText(secretFromManage) && secretFromManage.length() != SECRET_LENGTH) {
                    connection.getMetaData().put("secret", secretFromManage);
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
        Organization organization = application.getOrganization();
        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);
        return connection;
    }


}
