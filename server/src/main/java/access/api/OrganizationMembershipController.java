package access.api;

import access.exception.NotFoundException;
import access.model.*;
import access.repository.ApplicationMembershipRepository;
import access.repository.ApplicationRepository;
import access.repository.OrganizationMembershipRepository;
import access.request.ApplicationMembershipForm;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/organization_memberships"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class OrganizationMembershipController implements UserAccessRights{

    private static final Log LOG = LogFactory.getLog(OrganizationMembershipController.class);

    private final OrganizationMembershipRepository organizationMembershipRepository;

    public OrganizationMembershipController(OrganizationMembershipRepository organizationMembershipRepository) {
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @DeleteMapping({ "/{membership_id}"})
    public ResponseEntity<Void> delete(User user, @PathVariable( "membership_id") Long membershipId) {
        LOG.debug("/delete");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));
        confirmOrganizationMembership(user, organizationMembership.getOrganization(), Authority.ADMIN);
        organizationMembershipRepository.delete(organizationMembership);

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

}
