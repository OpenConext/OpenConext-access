package access.api;

import access.exception.NotFoundException;
import access.manage.Manage;
import access.model.*;
import access.repository.ApplicationRepository;
import access.repository.ConnectionRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;

@RestController
@RequestMapping(value = {"/api/v1/applications"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class ApplicationController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(ApplicationController.class);

    private final ApplicationRepository applicationRepository;
    private final ConnectionRepository connectionRepository;
    private final Manage manage;
    private final UserRepository userRepository;
    private final S3Storage s3Storage;

    public ApplicationController(ApplicationRepository applicationRepository,
                                 ConnectionRepository connectionRepository,
                                 Manage manage,
                                 UserRepository userRepository,
                                 S3Storage s3Storage) {
        this.applicationRepository = applicationRepository;
        this.connectionRepository = connectionRepository;
        this.manage = manage;
        this.userRepository = userRepository;
        this.s3Storage = s3Storage;
    }

    @GetMapping("/all/{organizationId}")
    public ResponseEntity<List<Application>> allByOrganization(@PathVariable("organizationId") Long id, User user) {
        LOG.debug("/all");

        Set<OrganizationMembership> organizationMemberships = user.getOrganizationMemberships();
        Organization organization = organizationMemberships.stream()
                .filter(membership -> membership.getOrganization().getId().equals(id))
                .map(membership -> membership.getOrganization())
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        List<Application> applications = this.applicationRepository.findByOrganization(organization);
        return ResponseEntity.ok(applications);
    }

    @GetMapping({"/{applicationId}"})
    public ResponseEntity<Application> find(User user, @PathVariable("applicationId") Long applicationId) {
        LOG.debug("/find application for " + user.getEmail());

        Application application = applicationRepository.findDetailsById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        application.getConnections().stream()
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
                .forEach(connection -> {
                    Map<String, Object> provider = manage.providerById(connection);
                    if (connection.mergeMetaData(provider)) {
                        connectionRepository.save(connection);
                    }
                });
        return ResponseEntity.ok(application);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Application> create(User user, @Validated @RequestBody Application application) {
        LOG.debug("/create application by " + user.getEmail());

        Organization organization = application.getOrganization();
        confirmOrganizationMembership(user, organization, Authority.MEMBER);
        application.setCreatedAt(Instant.now());
        application.setCreatedBy(user.getName());

        applicationRepository.save(application);

        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Application> update(User user, @Validated @RequestBody Application applicationData) {
        LOG.debug("/update application by " + user.getEmail());

        Application application = applicationRepository.findById(applicationData.getId())
                .orElseThrow(() -> new NotFoundException("Application not found"));
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.MEMBER);

        //If the metadata has changed, we must propagate this to manage
        boolean metaDataHasChanged = application.getMetaData().equals(applicationData.getMetaData());
        //However, we first need to merge the data; otherwise the outdated application metadata is used
        application.merge(applicationData);
        //Upload base64 encoded image to s3 storage if the logo has changed
        String logoUrl = application.getLogoUrl();
        if (StringUtils.hasText(logoUrl) && !logoUrl.startsWith("http")) {
            String url = s3Storage.uploadFile(logoUrl);
            application.setLogoUrl(url);
        }
        if (!metaDataHasChanged) {
            application.getConnections().forEach(connection -> {
                Map<String, Object> provider = manage.saveProvider(connection);
                connection.updateRemoteManageData(provider);
                connectionRepository.save(connection);
            });
        } else {
            Hibernate.initialize(application.getConnections());
        }
        applicationRepository.save(application);

        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    @DeleteMapping({"", "/{applicationId}"})
    public ResponseEntity<Map<String, Integer>> delete(User user, @PathVariable("applicationId") Long applicationId) {
        LOG.debug("/delete application by " + user.getEmail());

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationMembership(user, organization, application, Authority.ADMIN);

        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        organization.removeApplication(application);
        user.getOrganizationMemberships().forEach(organizationMembership -> {
            List<ApplicationMembership> applicationMemberships = organizationMembership.getApplicationMemberships()
                    .stream()
                    .filter(applicationMembership -> applicationMembership.getApplication().getId().equals(applicationId)).toList();
            organizationMembership.removeApplicationMemberships(applicationMemberships);
        });

        applicationRepository.deleteById(application.getId());

        return deleteResult();
    }
}
