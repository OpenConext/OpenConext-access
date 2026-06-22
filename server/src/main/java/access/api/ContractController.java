package access.api;

import access.config.Config;
import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.model.Contract;
import access.model.EntityType;
import access.model.Organization;
import access.model.User;
import access.repository.ContractRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/contracts"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@EnableConfigurationProperties(Config.class)
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class ContractController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(ContractController.class);

    private final ContractRepository contractRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final Config config;
    private final JiraClient jiraClient;

    public ContractController(ContractRepository contractRepository,
                              OrganizationRepository organizationRepository,
                              UserRepository userRepository,
                              Config config,
                              JiraClient jiraClient) {
        this.contractRepository = contractRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.config = config;
        this.jiraClient = jiraClient;
    }

    @GetMapping("/unsigned")
    public ResponseEntity<List<Contract>> unsigned(User user) {
        LOG.debug("/unsigned contracts");

        confirmSuperUser(user);

        return ResponseEntity.ok(contractRepository.findBySignedContractFalse());
    }

    @GetMapping("/{organizationId}")
    public ResponseEntity<Contract> get(User user, @PathVariable("organizationId") Long organizationId) {
        LOG.debug("/get contract for organizationId " + organizationId);

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        user = reinitializeUser(user, userRepository);
        confirmInstitutionAdmin(user, organization);

        Contract contract = contractRepository.findByOrganizationId(organizationId)
                .orElseThrow(() -> new NotFoundException("Contract not found"));
        return ResponseEntity.ok(contract);
    }

    @PostMapping("/{organizationId}")
    public ResponseEntity<Contract> create(User user,
                                           @PathVariable("organizationId") Long organizationId,
                                           @Validated @RequestBody Contract contract) {
        LOG.debug("/create contract for organizationId " + organizationId + " by " + user.getEmail());

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        user = reinitializeUser(user, userRepository);
        confirmInstitutionAdmin(user, organization);

        contract.setOrganization(organization);
        Contract saved = contractRepository.save(contract);
        if (!config.isTestEnvironment()) {
            String summary = String.format("User %s submitted a contract for organization %s.",
                user.getName(), organization.getName());
            String jiraKey = jiraClient.create(new JiraIssue(
                organization.getName(),
                null,
                String.format("%s%nVisit: %s/system/contracts",
                    summary, config.getClientUrl()),
                summary,
                EntityType.oidc10_rp,
                user.getEmail()
            ));
            LOG.info("Created Jira issue for new Contract: " + jiraKey);
            saved.setTicketKey(jiraKey);
        }
        saved = contractRepository.save(saved);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{organizationId}")
    public ResponseEntity<Contract> update(User user,
                                           @PathVariable("organizationId") Long organizationId,
                                           @Validated @RequestBody Contract contract) {
        LOG.debug("/update contract for organizationId " + organizationId + " by " + user.getEmail());

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        user = reinitializeUser(user, userRepository);
        confirmInstitutionAdmin(user, organization);

        if (contract.isSignedContract() && !user.isSuperUser()) {
            throw new UserRestrictionException("Only super users can sign a contract");
        }

        contractRepository.findById(contract.getId())
                .orElseThrow(() -> new NotFoundException("Contract not found"));

        contract.setOrganization(organization);
        Contract saved = contractRepository.save(contract);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

}
