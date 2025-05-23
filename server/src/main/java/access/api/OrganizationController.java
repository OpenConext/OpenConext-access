package access.api;

import access.exception.NotFoundException;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.OrganizationMembershipRepository;
import access.repository.OrganizationRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class OrganizationController {

    private static final Log LOG = LogFactory.getLog(OrganizationController.class);

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    @Autowired
    public OrganizationController(OrganizationRepository organizationRepository,
                                  OrganizationMembershipRepository organizationMembershipRepository) {
        this.organizationRepository = organizationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @GetMapping("/find/{id}")
    public ResponseEntity<Organization> find(@PathVariable("id") Long id) {
        LOG.debug("/find");

        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found"));
        return ResponseEntity.ok(organization);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Organization>> search(@RequestParam(value = "query") String query) {
        LOG.debug("/search");

        return ResponseEntity.ok(organizationRepository.findByNameContainingIgnoreCase(query));
    }

    @PostMapping("/")
    public ResponseEntity<Organization> create(User user, @RequestBody @Validated Organization organization) {
        organization = organizationRepository.save(organization);
        OrganizationMembership organizationMembership = new OrganizationMembership(user, organization, Authority.OWNER);
        organizationMembershipRepository.save(organizationMembership);
        return ResponseEntity.status(HttpStatus.CREATED).body(organization);
    }

}
