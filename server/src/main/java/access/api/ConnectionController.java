package access.api;

import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.manage.Manage;
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
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

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
    private final PasswordGenerator passwordGenerator = new PasswordGenerator();
    private final List<CharacterRule> rules = initPasswordGeneratorRules();

    public ConnectionController(ConnectionRepository connectionRepository,
                                ApplicationRepository applicationRepository,
                                UserRepository userRepository,
                                Manage manage) {
        this.connectionRepository = connectionRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.manage = manage;
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
        Map<String, Object> provider = manage.providerById(connection);
        connection.mergeMetaData(provider);
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
        if (connection.getStatus() == Status.COMPLETE &&
                connection.getProtocol().equals(EntityType.oidc10_rp) &&
                !StringUtils.hasText((String) connection.getMetaData().get("secret"))) {
            //generate secret, but store the raw-text variant, because Manage encodes it
            String secret = passwordGenerator.generatePassword(36, rules);
            connection.getMetaData().put("secret", secret);
        }
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

    @SuppressWarnings("unchecked")
    private Connection saveConnection(Connection connection) {
        //Put / Post to Manage only if the status is COMPLETE
        if (connection.getStatus().equals(Status.COMPLETE)) {
            Map<String, Object> provider = manage.saveProvider(connection);
            connection.setManageIdentifier((String) provider.get("id"));
            connection.setManageVersion((Integer) provider.get("version"));
            Map<String, Object> data = (Map<String, Object>) provider.get("data");
            connection.setManageEid((Integer) data.get("eid"));
        }
        return connectionRepository.save(connection);
    }

}
