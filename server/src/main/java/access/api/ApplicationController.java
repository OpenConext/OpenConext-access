package access.api;

import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.manage.ConnectionProviderConverter;
import access.manage.Manage;
import access.manage.ManageData;
import access.model.Application;
import access.model.ApplicationMembership;
import access.model.ApplicationStatus;
import access.model.Authority;
import access.model.Connection;
import access.model.ConnectionStatus;
import access.model.EntityType;
import access.model.ImportEntityRequest;
import access.model.MigrateApplicationRequest;
import access.model.NameExistsRequest;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.ApplicationMembershipRepository;
import access.repository.ApplicationRepository;
import access.repository.ConnectionRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.hibernate.Hibernate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;
import static access.manage.Manage.INSTITUTION_GUID;
import static access.manage.ManageData.*;

@RestController
@RequestMapping(value = {"/api/v1/applications"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
@SuppressWarnings("unchecked")
public class ApplicationController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(ApplicationController.class);

    private final ApplicationRepository applicationRepository;
    private final ApplicationMembershipRepository applicationMembershipRepository;
    private final ConnectionRepository connectionRepository;
    private final Manage manage;
    private final UserRepository userRepository;
    private final S3Storage s3Storage;
    private final ConnectionProviderConverter connectionProviderConverter;
    private final OrganizationRepository organizationRepository;
    private final Map<String, Object> arpInfo;

    public ApplicationController(ApplicationRepository applicationRepository,
                                 ApplicationMembershipRepository applicationMembershipRepository,
                                 ConnectionRepository connectionRepository,
                                 Manage manage,
                                 UserRepository userRepository,
                                 S3Storage s3Storage,
                                 ConnectionProviderConverter connectionProviderConverter,
                                 OrganizationRepository organizationRepository,
                                 ObjectMapper objectMapper) throws IOException {
        this.applicationRepository = applicationRepository;
        this.applicationMembershipRepository = applicationMembershipRepository;
        this.connectionRepository = connectionRepository;
        this.manage = manage;
        this.userRepository = userRepository;
        this.s3Storage = s3Storage;
        this.connectionProviderConverter = connectionProviderConverter;
        this.organizationRepository = organizationRepository;
        this.arpInfo = objectMapper.readValue(new ClassPathResource("/metadata/ARP.json").getInputStream(), new TypeReference<>() {
        });
    }

    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> all(User user) {
        LOG.debug("/allLightByOrganization");

        confirmSuperUser(user);

        List<Map<String, Object>> applications = applicationRepository.findAllLight();
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/all/light/{organizationId}")
    public ResponseEntity<List<Map<String, Object>>> allLightByOrganization(@PathVariable Long organizationId, User user) {
        LOG.debug("/allLightByOrganization");

        confirmSuperUser(user);

        List<Map<String, Object>> applications = applicationRepository.findAllLightByOrganization(organizationId);
        return ResponseEntity.ok(applications);
    }

    @GetMapping({"/{applicationId}"})
    @SuppressWarnings("unchecked")
    public ResponseEntity<Application> find(User user, @PathVariable("applicationId") Long applicationId) {
        LOG.debug("/find application for " + user.getEmail());

        Application application = applicationRepository.findDetailsById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        user = reinitializeUser(user, userRepository);
        confirmApplicationWriteAccess(user, application);

        AtomicReference<Map<String, Object>> latestChangedProvider = new AtomicReference<>();
        AtomicReference<Instant> latestRevision = new AtomicReference<>();
        application.getConnections().stream()
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
                .forEach(connection -> {
                    Map<String, Object> provider = manage.providerByConnection(connection);
                    if (connection.mergeMetaData(provider, false)) {
                        Map<String, Object> revision = (Map<String, Object>) provider.get("revision");
                        Instant revisionCreated = Instant.parse(revision.get("created").toString());
                        if (latestRevision.get() == null || revisionCreated.isAfter(latestRevision.get())) {
                            latestRevision.set(revisionCreated);
                            latestChangedProvider.set(provider);
                        }
                        connectionRepository.save(connection);
                    }
                    if (connection.getStatus().equals(ConnectionStatus.PROD_READY)) {
                        connection.convertChangeRequests(manage.getChangeRequests(connection));
                    }
                });
        Map<String, Object> provider = latestChangedProvider.get();
        if (provider != null) {
            //Take the last updated provider and merge / save the application metaData
            HashMap<String, Object> updatedMetaData = connectionProviderConverter.convertProviderToApplicationMetaData(provider);
            application.setMetaData(updatedMetaData);

            Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
            application.setLogoUrl((String) metaDataFields.getOrDefault("logo:0:url", application.getLogoUrl()));
            application.setName((String) metaDataFields.getOrDefault("coin:application_name", application.getName()));
            applicationRepository.save(application);
        }
        ManageData.removeSecrets(application);

        return ResponseEntity.ok(application);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Application> create(User user, @Validated @RequestBody Application application) {
        LOG.debug("/create application by " + user.getEmail());

        Organization organization = application.getOrganization();
        confirmOrganizationMembership(user, organization, Authority.MEMBER);

        application.setCreatedAt(Instant.now());
        application.setCreatedBy(user.getName());
        application.setOwner(user);
        Application applicationSaved = applicationRepository.save(application);

        Optional<OrganizationMembership> optionalOrganizationMembership = user.getOrganizationMemberships().stream()
                .filter(organizationMembership -> organizationMembership.getOrganization().getId().equals(organization.getId()))
                .findFirst();
        //Super User's may not have organization memberships
        optionalOrganizationMembership.ifPresent(organizationMembership -> {
            ApplicationMembership applicationMembership =
                    new ApplicationMembership(applicationSaved, organizationMembership);
            applicationMembershipRepository.save(applicationMembership);
        });
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationSaved);
    }

    @PostMapping("/name-exists")
    public ResponseEntity<Boolean> nameExists(User user, @Validated @RequestBody NameExistsRequest nameExistsRequest) {
        LOG.debug("/name-exists for " + nameExistsRequest.getName());

        Organization organization = organizationRepository.findById(nameExistsRequest.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        user = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(user, organization, Authority.MEMBER);

        Long applicationId = nameExistsRequest.getApplicationId();
        boolean exists = applicationRepository.findByNameIgnoreCaseAndOrganization(nameExistsRequest.getName(), organization)
                .filter(application -> applicationId == null || !application.getId().equals(applicationId))
                .isPresent();
        return ResponseEntity.ok(exists);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Application> update(User user, @Validated @RequestBody Application applicationData) {
        LOG.debug("/update application by " + user.getEmail());

        Application application = applicationRepository.findById(applicationData.getId())
                .orElseThrow(() -> new NotFoundException("Application not found"));

        user = this.reinitializeUser(user, userRepository);

        confirmApplicationWriteAccess(user, application);

        //If the metadata has changed, we must propagate this to manage
        boolean metaDataHasChanged = !application.getMetaData().equals(applicationData.getMetaData());
        //However, we first need to merge the data; otherwise the outdated application metadata is used
        application.merge(applicationData);
        //Upload base64 encoded image to s3 storage if the logo has changed
        String logoUrl = application.getLogoUrl();
        if (StringUtils.hasText(logoUrl) && !logoUrl.startsWith("http")) {
            String url = s3Storage.uploadFile(logoUrl);
            application.setLogoUrl(url);
            metaDataHasChanged = true;
        }
        if (metaDataHasChanged) {
            application.getConnections()
                    .stream()
                    .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
                    .forEach(connection -> {
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
    public ResponseEntity<Map<String, Object>> delete(User user, @PathVariable("applicationId") Long applicationId) {
        LOG.debug("/delete application by " + user.getEmail());

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        Organization organization = application.getOrganization();

        user = this.reinitializeUser(user, userRepository);
        confirmApplicationDeleteAccess(user, application);

        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        organization.removeApplication(application);
        user.getOrganizationMemberships().forEach(organizationMembership -> {
            List<ApplicationMembership> applicationMemberships = organizationMembership.getApplicationMemberships()
                    .stream()
                    .filter(applicationMembership -> applicationMembership.getApplication().getId().equals(applicationId)).toList();
            organizationMembership.removeApplicationMemberships(applicationMemberships);
        });

        application.getConnections()
                .stream()
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
                .forEach(connection -> manage.deleteProvider(connection));

        applicationRepository.deleteById(application.getId());

        return deleteResult();
    }

    @GetMapping("/identity-providers-allowed-connections/{applicationId}")
    public ResponseEntity<List<Map<String, Object>>> identityProvidersByAllowedConnections(User user,
                                                                                           @PathVariable Long applicationId) {
        LOG.debug("/identityProvidersByAllowedConnections by: " + user.getEmail());
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        user = reinitializeUser(user, userRepository);

        confirmApplicationDeleteAccess(user, application);

        List<Connection> connections = new ArrayList<>(application.getConnections());
        List<Map<String, Object>> identityProviders = manage.identityProvidersByAllowedConnections(connections);
        return ResponseEntity.ok(identityProviders);
    }

    @PutMapping({"/migrate"})
    @Transactional
    public ResponseEntity<Map<String, Object>> migrate(User user, @Validated @RequestBody MigrateApplicationRequest migrateApplicationRequest) {
        LOG.debug("/migrate application by " + user.getEmail());

        confirmSuperUser(user);

        Application application = applicationRepository.findById(migrateApplicationRequest.getApplicationId())
                .orElseThrow(() -> new NotFoundException("Application not found"));
        Organization newOrganization = organizationRepository.findById(migrateApplicationRequest.getNewOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        application.setOrganization(newOrganization);
        applicationRepository.save(application);

        AtomicReference<String> institutionGuid = new AtomicReference<>();
        if (StringUtils.hasText(newOrganization.getManageIdentifier())) {
            Map<String, Object> identityProvider = manage.providerByManageIdentifier(EntityType.saml20_idp, newOrganization.getManageIdentifier());
            Map<String, Object> metaDataFields = getMetaDataFields(getData(identityProvider));
            institutionGuid.set((String) metaDataFields.get(INSTITUTION_GUID));
        }

        application.getConnections()
                .stream()
                .filter(connection -> !isEmpty(connection.getManageIdentifier()))
                .forEach(connection -> {
            Map<String, Object> provider = manage.providerByConnection(connection);
            Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
            metaDataFields.put("OrganizationName:en", newOrganization.getName());
            metaDataFields.put("OrganizationName:nl", newOrganization.getName());
            //The connections need to be linked to the new identityProvider - if the new Organization is a known IdP in Manage
            if (StringUtils.hasText(institutionGuid.get())) {
                metaDataFields.put(INSTITUTION_GUID, institutionGuid.get());
            } else {
                metaDataFields.remove(INSTITUTION_GUID);
            }

            Map<String, Object> updatedProvider = manage.updateProvider(provider);
            Integer version = (Integer) updatedProvider.get("version");
            connection.setManageVersion(version);
            connectionRepository.save(connection);
        });

        return Results.okResult();
    }

    @PostMapping({"/import"})
    public ResponseEntity<Map<String, Object>> importEntity(User user,
                                                            @Validated @RequestBody ImportEntityRequest importEntityRequest) {
        LOG.debug("/import entity by " + user.getEmail());

        confirmSuperUser(user);

        Organization organization = organizationRepository.findById(importEntityRequest.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        Map<String, Object> serviceProvider = importEntityRequest.getServiceProvider();

        Application application = importEntityRequest.getApplicationId() != null ?
                applicationRepository.findById(importEntityRequest.getApplicationId())
                        .orElseThrow(() -> new NotFoundException("Application not found")) :
                createApplicationFromProvider(user, organization, serviceProvider);

        Map<String, Object> data = getData(serviceProvider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);

        //As this is an import, we need to deduce the profile / motivation
        Map<String, Object> arp = (Map<String, Object>) data.get("arp");
        String profile = arpProfileName(arp);
        arp.put("profile", profile);
        serviceProvider = manage.updateProvider(serviceProvider);

        Connection connection = new Connection(
                (String) metaDataFields.get("name:en"),
                application,
                new HashMap<>(),// We will fill the metadata later
                EntityType.valueOf((String) serviceProvider.get("type"))
        );
        connection.setSecretSet(true);
        connection.setStatus(ConnectionStatus.PENDING_PROD);
        connection.updateRemoteManageData(serviceProvider);
        connection.mergeMetaData(serviceProvider, true);

        Connection savedConnection = connectionRepository.save(connection);
        Map<String, Object> body = Map.of(
                "status", HttpStatus.OK.value(),
                "connectionId", savedConnection.getId(),
                "applicationId", application.getId()
        );
        return ResponseEntity.status(HttpStatus.OK).body(body);
    }

    private Application createApplicationFromProvider(User user, Organization organization, Map<String, Object> serviceProvider) {
        Map<String, Object> data = getData(serviceProvider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);
        HashMap<String, Object> metaData = this.connectionProviderConverter.convertProviderToApplicationMetaData(serviceProvider);
        String name = (String) metaDataFields.getOrDefault("coin:application_name", (String) metaDataFields.get("name:en"));
        Application application = new Application(
                name,
                organization,
                "System",
                new HashMap<>()
        );
        application.setMetaData(metaData);
        String logoUrl = (String) metaDataFields.get("logo:0:url");
        application.setLogoUrl(logoUrl);
        application.setCreatedBy(user.getName());
        application.setStatus(ApplicationStatus.COMPLETE);
        return applicationRepository.save(application);
    }

    private String arpProfileName(Map<String, Object> arp) {
        Set<String> attributeNames = ((Map<String, Object>) arp.get("attributes")).keySet();

        List<Map<String, Object>> attributes = (List<Map<String, Object>>) this.arpInfo.get("attributes");
        Map<String, String> attributesMap = attributes.stream().collect(Collectors.toMap(
                attr -> (String) attr.get("name"), attr -> (String) attr.get("urn")
        ));
        List<Map<String, Object>> profiles = (List<Map<String, Object>>) this.arpInfo.get("profiles");
        return profiles.stream().filter(profile -> {
            List<String> profileAttributes = (List<String>) profile.get("attributes");
            List<String> optionalAttributes = (List<String>) profile.getOrDefault("optionalAttributes", List.of());
            List<String> allAttributes = new ArrayList<>(profileAttributes);
            allAttributes.addAll(optionalAttributes);
            Set<String> urns = allAttributes.stream()
                    .map(attr -> attributesMap.get(attr))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            return urns.containsAll(attributeNames);
        }).findFirst()
                .map(profile -> (String) profile.get("name"))
                .orElse("personalized");
    }
}
