package access.api;

import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.manage.ChangeRequest;
import access.manage.Manage;
import access.manage.PathUpdateType;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.ConnectionRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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

    private final ConnectionRepository connectionRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final Manage manage;
    private final JiraClient jiraClient;
    private final PasswordGenerator passwordGenerator = new PasswordGenerator();
    private final List<CharacterRule> rules = initPasswordGeneratorRules();

    public ConnectionController(ConnectionRepository connectionRepository,
                                ApplicationRepository applicationRepository,
                                UserRepository userRepository,
                                Manage manage,
                                JiraClient jiraClient) {
        this.connectionRepository = connectionRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.manage = manage;
        this.jiraClient = jiraClient;
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
        Connection connection = connectionRepository.findById(connectionData.getId())
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        Organization organization = application.getOrganization();
        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        connection.merge(connectionData);
        connection = saveConnection(connection);
        return ResponseEntity.status(HttpStatus.CREATED).body(connection);
    }

    @PutMapping(value = "/reset-secret/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> secret(User user, @PathVariable("connectionId") Long connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        String secret = passwordGenerator.generatePassword(36, rules);
        connection.getMetaData().put("secret", secret);
        saveConnection(connection);

        return Collections.singletonMap("secret", secret);
    }

    @PutMapping(value = "/request-production-status/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> requestProductionStatus(User user,
                                                                       @PathVariable("connectionId") Long connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        String changeRequestURL = manage.changeRequestURL(connection.getEnvironment(), connection);

        Map<String, Object> provider = manage.providerById(connection);
        String entityId = (String) ((Map) provider.get("data")).get("entityid");
        String lineSeparator = System.lineSeparator();
        String jiraKey = jiraClient.create(new JiraIssue(
                entityId,
                String.format("Production status requested by %s for %s.",
                        user.getName(), connection.getName()),
                String.format("A change request in manage has been created to merge this user request. See:%s",
                        changeRequestURL),
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

        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        if (StringUtils.hasText(connection.getManageIdentifier())) {
            manage.deleteProvider(connection);
        }
        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        application.removeConnection(connection);

        connectionRepository.deleteById(connectionId);

        return deleteResult();
    }

    @SuppressWarnings("unchecked")
    private Connection saveConnection(Connection connection) {
        //Put / Post to Manage only if the status is not OPEN
        if (!connection.getStatus().equals(ConnectionStatus.OPEN)) {
            if (connection.getProtocol().equals(EntityType.oidc10_rp) &&
                    !StringUtils.hasText((String) connection.getMetaData().get("secret")) &&
                    connection.getMetaData().getOrDefault("pkce", false) == Boolean.FALSE) {
                //generate secret but store the raw-text variant, because Manage encodes it
                String secret = passwordGenerator.generatePassword(36, rules);
                connection.getMetaData().put("secret", secret);
            }

            Map<String, Object> provider = manage.saveProvider(connection);
            connection.updateRemoteManageData(provider);

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

}
