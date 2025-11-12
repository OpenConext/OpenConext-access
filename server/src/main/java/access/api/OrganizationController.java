package access.api;

import access.config.Config;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.model.*;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.hibernate.Hibernate;
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

import java.util.List;
import java.util.Map;

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
    private final UserRepository userRepository;
    private final JiraClient jiraClient;


    @Autowired
    public OrganizationController(OrganizationRepository organizationRepository,
                                  OrganizationMembershipRepository organizationMembershipRepository,
                                  UserRepository userRepository,
                                  Config config,
                                  JiraClient jiraClient) {
        this.organizationRepository = organizationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.config = config;
        this.userRepository = userRepository;
        this.jiraClient = jiraClient;
    }

    @GetMapping("/find/{id}")
    public ResponseEntity<Organization> find(User user, @PathVariable("id") Long id) {
        LOG.debug("/find Organization by " + user.getEmail());

        Organization organization = organizationRepository.findDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        confirmOrganizationMembership(user, organization, Authority.MEMBER);

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

        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.fromString(sortDirection), sort));

        Page<Map<String, Object>> usersPage = StringUtils.hasText(query) ? organizationRepository.searchByPageWithKeyword(FullSearchQueryParser.parse(query), pageable) :
                organizationRepository.searchByPage(pageable);
        return ResponseEntity.ok(usersPage);
    }


    @GetMapping("/users/{id}")
    public ResponseEntity<Organization> light(User user, @PathVariable("id") Long id) {
        LOG.debug("/find Organization light by " + user.getEmail());

        Organization organization = organizationRepository.findUsersById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        confirmOrganizationMembership(user, organization, Authority.GUEST);

        return ResponseEntity.ok(organization);
    }

    @GetMapping("/light/{id}")
    public ResponseEntity<Organization> light(@PathVariable("id") Long id) {
        LOG.debug("/light");

        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        return ResponseEntity.ok(organization);
    }

    @GetMapping("/invitation/{id}")
    public ResponseEntity<Organization> name(@PathVariable("id") Long id) {
        LOG.debug("/name");
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        Hibernate.initialize(organization.getApplications());
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
        String summary = String.format("User %s created a new Organisation %s in Access.",
                user.getName(),
                orgName);
        String jiraKey = jiraClient.create(new JiraIssue(
                orgName,
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

        Organization savedOrganization = organizationRepository.save(newOrganization);
        // User becomes admin
        OrganizationMembership organizationMembership = new OrganizationMembership(user, savedOrganization, Authority.ADMIN);
        organizationMembershipRepository.save(organizationMembership);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Organization> update(User user, @RequestBody @Validated OrganizationForm organizationForm) {
        confirmSuperUser(user);
        Organization organization = organizationRepository.findById(organizationForm.getId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        organization.setName(organizationForm.getName());

        Organization savedOrganization = organizationRepository.save(organization);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }

    @PutMapping("/status/{organizationId}/{status}")
    public ResponseEntity<Organization> approve(User user, @PathVariable("organizationId") Long organizationId,
                                                @PathVariable("status") OrganizationStatus status) {
        confirmSuperUser(user);
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        organization.setStatus(status);

        Organization savedOrganization = organizationRepository.save(organization);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }

    @DeleteMapping({"", "/{organizationId}"})
    public ResponseEntity<Map<String, Integer>> delete(User user, @PathVariable("organizationId") Long organizationId) {
        LOG.debug("/delete organization by " + user.getEmail());

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        user = this.reinitializeUser(user, userRepository);
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        organizationRepository.deleteOrganizationById(organizationId);

        return deleteResult();
    }

    private Organization createOrganization(User user, String name) {
        String orgSchacHomeOrganization = getOrgSchacHomeOrganization(user, name);
        return new Organization(name, orgSchacHomeOrganization);
    }

    private String getOrgSchacHomeOrganization(User user, String name) {
        String schacHomeOrganization = user.getSchacHomeOrganization().toLowerCase();
        String orgSchacHomeOrganization;
        if (config.getEduIdSchacHomeOrganization().equals(schacHomeOrganization)) {
            String normalizedName = name
                    .replaceAll("[^a-zA-Z_ ]", "")
                    .trim()
                    .replaceAll(" ", "_")
                    .toLowerCase();
            orgSchacHomeOrganization = String.format("%s.%s", normalizedName, config.getEduIdSchacHomeOrganization());
        } else {
            orgSchacHomeOrganization = schacHomeOrganization;
        }
        return orgSchacHomeOrganization;
    }

}
