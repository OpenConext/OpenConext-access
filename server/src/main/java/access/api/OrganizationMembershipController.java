package access.api;

import access.exception.NotFoundException;
import access.model.Authority;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.OrganizationMembershipRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;

@RestController
@RequestMapping(value = {"/api/v1/organization_memberships"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class OrganizationMembershipController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(OrganizationMembershipController.class);

    private final OrganizationMembershipRepository organizationMembershipRepository;

    public OrganizationMembershipController(OrganizationMembershipRepository organizationMembershipRepository) {
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @DeleteMapping({"/{membership_id}"})
    public ResponseEntity<Map<String, Object>> delete(User user, @PathVariable("membership_id") Long membershipId) {
        LOG.debug("/delete");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));
        confirmOrganizationMembership(user, organizationMembership.getOrganization(), Authority.ADMIN);
        organizationMembershipRepository.delete(organizationMembership);

        return deleteResult();
    }

    @PutMapping({"", "/"})
    public ResponseEntity<OrganizationMembership> update(User user, @RequestBody OrganizationMembership organizationMembershipUpdate) {
        LOG.debug("/update");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(organizationMembershipUpdate.getId())
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));

        Authority newAuthority = organizationMembershipUpdate.getAuthority();
        Authority requiredAuthority = Authority.ADMIN.equals(newAuthority) ? Authority.ADMIN : Authority.MEMBER;
        confirmOrganizationMembership(user, organizationMembership.getOrganization(), requiredAuthority);

        organizationMembership.setAuthority(newAuthority);
        organizationMembership = organizationMembershipRepository.save(organizationMembership);
        return ResponseEntity.ok(organizationMembership);
    }
}
