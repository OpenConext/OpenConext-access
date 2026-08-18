package access.api;

import access.config.Config;
import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.manage.Manage;
import access.manage.ManageData;
import access.model.*;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;

@RestController
@RequestMapping(value = {"/api/v1/organizations"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@EnableConfigurationProperties(Config.class)
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class OrganizationController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(OrganizationController.class);

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final Config config;
    private final Manage manage;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper ;
    private final JiraClient jiraClient;


    @Autowired
    public OrganizationController(OrganizationRepository organizationRepository,
                                  OrganizationMembershipRepository organizationMembershipRepository,
                                  Manage manage,
                                  UserRepository userRepository,
                                  Config config,
                                  ObjectMapper objectMapper,
                                  JiraClient jiraClient) {
        this.organizationRepository = organizationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.manage = manage;
        this.config = config;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.jiraClient = jiraClient;
    }

    @GetMapping("/applications/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> findOrganizationDetailById(User user,
                                                                          @PathVariable Long id) {
        LOG.debug("/find Organization by " + user.getEmail());

        User userFromDB = reinitializeUser(user, userRepository);

        Organization organization = organizationRepository.findApplicationsDetailsOrganizationById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        OrganizationMembership organizationMembership= userFromDB.getOrganizationMemberships()
                .stream()
                .filter(membership -> membership.getOrganization().getId().equals(organization.getId()))
                .findFirst()
                //little hack to avoid multiple logic branches
                .or(() -> userFromDB.isSuperUser() ? Optional.of(new OrganizationMembership(Authority.ADMIN)) : Optional.empty())
                .orElseThrow(() -> new UserRestrictionException(
                        String.format("User %s is not a member of organization %s", user.getEmail(), id)));

        organization.getApplications().forEach(application -> {
            //We only fetch change-requests for applications with production status
            application.getConnections().stream()
                    .filter(conn -> conn.changeRequestRequired())
                    .forEach(connection ->
                        connection.convertChangeRequests(manage.getChangeRequests(connection)));
        });

        Map<String, Object> organizationMap = objectMapper.convertValue(organization, new TypeReference<>() {
        });

        if (organizationMembership.getAuthority().equals(Authority.GUEST)) {
            //we filter out applications where there is no app membership for the GUEST user
            List<Long> applicationIdentifiers = organizationMembership.getApplicationMemberships().stream()
                    .map(applicationMembership -> applicationMembership.getApplication().getId())
                    .toList();
            List<Map<String, Object>> applications = (List<Map<String, Object>>) organizationMap.getOrDefault("applications", List.of());
            applications.removeIf(application -> !applicationIdentifiers.contains((Long)application.get("id")));
        }
        List<Map<String, Object>> applications = (List<Map<String, Object>>) organizationMap.getOrDefault("applications", List.of());
        applications.forEach(application -> ManageData.removeSecrets(application));
        return ResponseEntity.ok(organizationMap);
    }


    @GetMapping("/details/{id}")
    public ResponseEntity<Organization> findUserManagementDetails(User user,
                                             @PathVariable("id") Long id) {
        LOG.debug("/find Organization user-management by " + user.getEmail());

        User userFromDB = reinitializeUser(user, userRepository);
        Organization organization = organizationRepository.findUserManagementOrganizationById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        confirmOrganizationMembership(userFromDB, organization, Authority.MEMBER);

        return ResponseEntity.ok(organization);
    }

    @GetMapping("/mine/{id}")
    public ResponseEntity<Organization> findMyOrganization(User user,
                                                           @PathVariable("id") Long id) {
        LOG.debug("/find Organization mine by " + user.getEmail());

        User userFromDB = reinitializeUser(user, userRepository);
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        confirmOrganizationMembership(userFromDB, organization, Authority.GUEST);

        if (StringUtils.hasText(organization.getManageIdentifier())) {
            Map<String, Object> provider = manage.providerByManageIdentifier(EntityType.saml20_idp, organization.getManageIdentifier());
            if (organization.mergeMetaData(provider, false)) {
                organizationRepository.save(organization);
            }
        }
        return ResponseEntity.ok(organization);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Map<String, Object>>> search(@Parameter(hidden = true) User user,
                                                            @RequestParam(value = "query", required = false, defaultValue = "") String query,
                                                            @RequestParam(value = "pageNumber", required = false, defaultValue = "0") int pageNumber,
                                                            @RequestParam(value = "pageSize", required = false, defaultValue = "10") int pageSize,
                                                            @RequestParam(value = "sort", required = false, defaultValue = "name") String sort,
                                                            @RequestParam(value = "sortDirection", required = false, defaultValue = "ASC") String sortDirection) {
        LOG.debug(String.format("/search/paginated for user %s", user.getEduPersonPrincipalName()));
        //Only used in the Systems tab and exclusively for superusers
        confirmSuperUser(user);

        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.fromString(sortDirection), sort));

        Page<Map<String, Object>> usersPage = StringUtils.hasText(query) ? organizationRepository.searchByPageWithKeyword(FullSearchQueryParser.parse(query), pageable) :
                organizationRepository.searchByPage(pageable);
        return ResponseEntity.ok(usersPage);
    }

    @GetMapping("/search-landing")
    public ResponseEntity<List<Map<String, Object>>> search(@Parameter(hidden = true) User user,
                                                            @RequestParam(value = "query") String query) {
        LOG.debug(String.format("/landing-search for user %s", user.getEduPersonPrincipalName()));
        //We can enforce any authorization rules here, as this is performed on the landing page
        List<Map<String, Object>> organizations = organizationRepository.searchWithKeyword(FullSearchQueryParser.parse(query));
        return ResponseEntity.ok(organizations);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> allLight(@Parameter(hidden = true) User user) {
        LOG.debug(String.format("/all organization for user %s", user.getEduPersonPrincipalName()));

        confirmSuperUser(user);

        List<Map<String, Object>> organizations = organizationRepository.findAllLight();
        return ResponseEntity.ok(organizations);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<Organization> usersOfOrganization(User user, @PathVariable("id") Long id) {
        LOG.debug("/find Organization light by " + user.getEmail());

        Organization organization = organizationRepository.findUsersOfOrganizationById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        User userFromDB = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, Authority.GUEST);

        return ResponseEntity.ok(organization);
    }

    @GetMapping("/light/{id}")
    public ResponseEntity<Map<String, String>> light(@PathVariable Long id) {
        LOG.debug("/light");

        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        return ResponseEntity.ok(Map.of("name", organization.getName()));
    }

    @GetMapping("/invitation/{id}")
    public ResponseEntity<Organization> name(User user, @PathVariable Long id) {
        LOG.debug("/name");
        Organization organization = organizationRepository.findApplicationsOrganizationById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        user = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(user, organization, Authority.MEMBER);
        return ResponseEntity.ok(organization);
    }

    @GetMapping("/status/pending")
    public ResponseEntity<List<Organization>> pendingApproval(User user) {
        LOG.debug("/pendingApproval Organizations by " + user.getEmail());
        confirmSuperUser(user);
        List<Organization> organizations = organizationRepository.findByStatus(OrganizationStatus.PENDING_APPROVAL);

        return ResponseEntity.ok(organizations);
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Organization> create(User user, @RequestBody @Validated Organization organization) {
        String name = organization.getName();
        Organization newOrganization = createOrganization(user, name);
        String orgName = newOrganization.getName();
        LOG.info(String.format("Creating new Organisation %s for %s", name, user.getEmail()));
        // Now create a Jira ticket
        if (config.isTestEnvironment()) {
            LOG.info("Skipping creatiob of Jira issue for new Organization: " + orgName);
            newOrganization.setStatus(OrganizationStatus.APPROVED);
        } else  {
            String summary = String.format("User %s created a new Organisation %s in Access.",
                user.getName(),
                orgName);
            String jiraKey = jiraClient.create(new JiraIssue(
                orgName,
                null,// There is no identity provider for approving organizations
                String.format("%s The new organisation is pending approval. Visit to evaluate:%s%s",
                    summary,
                    System.lineSeparator(),
                    String.format("%s/system/organizationPendingApproval", config.getClientUrl())),
                summary,
                EntityType.oidc10_rp,
                user.getEmail()
            ));
            LOG.info("Created Jira issue for new Organization: " + jiraKey);
            newOrganization.setTicketKey(jiraKey);
        }

        Organization savedOrganization = organizationRepository.save(newOrganization);
        // User becomes admin
        OrganizationMembership organizationMembership = new OrganizationMembership(user, savedOrganization, Authority.ADMIN);
        organizationMembershipRepository.save(organizationMembership);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Organization> update(User user, @RequestBody @Validated OrganizationForm organizationForm) {
        Organization organization = findOrganizationById(organizationForm.getId());
        //IdP can't change the name of the IdP in Manage
        if (StringUtils.hasText(organization.getManageIdentifier())) {
            throw new InvalidInputException("Can not update name, Organization has manage identifier. " + organization.getName());
        }

        User userFromDB = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, Authority.ADMIN);

        organization.setName(organizationForm.getName());
        Organization savedOrganization = organizationRepository.save(organization);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }


    @PutMapping("/status/{organizationId}/{status}")
    public ResponseEntity<Organization> approve(User user, @PathVariable("organizationId") Long organizationId,
                                                @PathVariable("status") OrganizationStatus status) {
        confirmSuperUser(user);
        Organization organization = findOrganizationById(organizationId);
        organization.setStatus(status);

        Organization savedOrganization = organizationRepository.save(organization);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }

    @PutMapping("/metadata/{organizationId}")
    public ResponseEntity<Organization> updateMetaData(User user,
                                                       @PathVariable("organizationId") Long organizationId,
                                                       @RequestBody Map<String, Object> metaData) {
        Organization organization = findOrganizationById(organizationId);

        if (!StringUtils.hasText(organization.getManageIdentifier())) {
            throw new InvalidInputException("Can not update metadata. Organization has no manage identifier: " + organization.getName());
        }
        User userFromDB = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, Authority.ADMIN);

        organization.setMetaData(metaData);
        manage.saveIdentityProvider(organization);

        return ResponseEntity.status(HttpStatus.CREATED).body(organization);
    }

    private Organization findOrganizationById(Long organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
    }

    @DeleteMapping({"", "/{organizationId}"})
    public ResponseEntity<Map<String, Object>> delete(User user, @PathVariable("organizationId") Long organizationId) {
        LOG.debug("/delete organization by " + user.getEmail());

        Organization organization = findOrganizationById(organizationId);

        user = this.reinitializeUser(user, userRepository);
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        organization.getApplications().stream()
                .map(Application::getConnections)
                .flatMap(Collection::stream)
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
                .forEach(connection -> manage.deleteProvider(connection));

        organizationRepository.deleteOrganizationById(organizationId);

        return deleteResult();
    }

    @GetMapping("/admin-email/{organizationId}")
    public ResponseEntity<Map<String, Object>> adminEmail(User user, @PathVariable Long organizationId) {
        LOG.debug("/admin-email by: " + user.getEmail());

        Map<String, Object> admin = userRepository.findAdminByOrganizationAndMember(organizationId, user.getId());
        return ResponseEntity.ok(admin);
    }

    @GetMapping("/identity-providers-allowed-connections/{organizationId}")
    public ResponseEntity<List<Map<String, Object>>> identityProvidersByAllowedConnections(User user,
                                                                                           @PathVariable Long organizationId) {
        LOG.debug("/identityProvidersByAllowedConnections by: "+user.getEmail());
        Organization organization = organizationRepository.findApplicationsOrganizationById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        user = reinitializeUser(user ,userRepository);
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        List<Connection> connections = organization.getApplications().stream()
                .map(Application::getConnections)
                .flatMap(Collection::stream)
                .toList();
        List<Map<String, Object>> identityProviders = manage.identityProvidersByAllowedConnections(connections);
        return ResponseEntity.ok(identityProviders);
    }

    private Organization createOrganization(User user, String name) {
        String orgSchacHomeOrganization = getOrgSchacHomeOrganization(user, name);
        return new Organization(name, orgSchacHomeOrganization);
    }

    private String getOrgSchacHomeOrganization(User user, String name) {
        String schacHomeOrganization = user.getSchacHomeOrganization().toLowerCase();
        String orgSchacHomeOrganization;
        boolean isExternalUserFromSchacHome = config.getExternalSchacHomeOrganizations().contains(schacHomeOrganization);
        if (isExternalUserFromSchacHome) {
            String normalizedName = name
                    .replaceAll("[^a-zA-Z_ ]", "")
                    .trim()
                    .replaceAll(" ", "_")
                    .toLowerCase();
            orgSchacHomeOrganization = String.format("%s.%s", normalizedName, schacHomeOrganization);
        } else {
            orgSchacHomeOrganization = schacHomeOrganization;
        }
        return orgSchacHomeOrganization;
    }

}
