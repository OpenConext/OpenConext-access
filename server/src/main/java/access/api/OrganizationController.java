package access.api;

import access.config.Config;
import access.exception.NotFoundException;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

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

    @Autowired
    public OrganizationController(OrganizationRepository organizationRepository,
                                  OrganizationMembershipRepository organizationMembershipRepository,
                                  UserRepository userRepository,
                                  Config config) {
        this.organizationRepository = organizationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.config = config;
        this.userRepository = userRepository;
    }

    @GetMapping("/find/{id}")
    public ResponseEntity<Organization> find(User user, @PathVariable("id") Long id) {
        LOG.debug("/find Organization by " + user.getEmail());

        Organization organization = organizationRepository.findDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        confirmOrganizationMembership(user, organization, Authority.MEMBER);

        return ResponseEntity.ok(organization);
    }

    @GetMapping("/light/{id}")
    public ResponseEntity<Organization> light(@PathVariable("id") Long id) {
        LOG.debug("/light");

        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));

        return ResponseEntity.ok(organization);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Organization>> search(@RequestParam(value = "query") String query) {
        LOG.debug("/search");

        return ResponseEntity.ok(organizationRepository.findByNameContainingIgnoreCase(query));
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Organization> create(User user, @RequestBody @Validated Organization organization) {
        String name = organization.getName();
        Organization newOrganization = createOrganization(user, name);
        Organization savedOrganization = organizationRepository.save(newOrganization);
        // User becomes admin
        OrganizationMembership organizationMembership = new OrganizationMembership(user, savedOrganization, Authority.ADMIN);
        organizationMembershipRepository.save(organizationMembership);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedOrganization);
    }

    @DeleteMapping({"", "/{organizationId}"})
    public ResponseEntity<Void> delete(User user, @PathVariable("organizationId") Long organizationId) {
        LOG.debug("/delete organization by " + user.getEmail());

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        User userFromDB = this.reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, Authority.ADMIN);

        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        user.getOrganizationMemberships().stream()
                .filter(organizationMembership -> organizationMembership.getOrganization().getId().equals(organizationId))
                .findFirst()
                .ifPresent(organizationMembership -> userFromDB.removeOrganizationMembership(organizationMembership));

        organizationRepository.delete(organization);

        return ResponseEntity.status(HttpStatus.OK).build();
    }

    private Organization createOrganization(User user, String name) {
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
        return new Organization(name, orgSchacHomeOrganization);
    }

}
