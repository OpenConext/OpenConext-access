package access.api;

import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.ConnectionRepository;
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

    public ConnectionController(ConnectionRepository connectionRepository, ApplicationRepository applicationRepository) {
        this.connectionRepository = connectionRepository;
        this.applicationRepository = applicationRepository;
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
        confirmApplicationMembership(user, application.getOrganization(), application, Authority.MEMBER);
        connection = connectionRepository.save(connection);

        return ResponseEntity.status(HttpStatus.CREATED).body(connection);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Application> update(User user, @Validated @RequestBody Connection connectionData) {
        LOG.debug("/update connection by " + user.getEmail());

        Connection connection = connectionRepository.findById(connectionData.getId())
                .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        Organization organization = application.getOrganization();
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        connection.merge(connectionData);
        applicationRepository.save(application);

        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

}
