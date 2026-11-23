package access.api;

import access.audit.AuditAction;
import access.audit.AuditCategory;
import access.audit.AuditLogger;
import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.invite.InviteClient;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import access.repository.OrganizationMembershipRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

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
    private final AuditLogger auditLogger;
    private final InviteClient inviteClient;

    public OrganizationMembershipController(OrganizationMembershipRepository organizationMembershipRepository,
                                            AuditLogger auditLogger,
                                            InviteClient inviteClient) {
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.inviteClient = inviteClient;
        this.auditLogger = auditLogger;
    }

    /*
     * Detail of a membership for the user detail page: the user attributes that are not part of the regular
     * membership JSON, the application memberships and the Invite roles of the user.
     */
    @GetMapping({"/{membership_id}"})
    public ResponseEntity<Map<String, Object>> detail(User user, @PathVariable("membership_id") Long membershipId) {
        LOG.debug("/detail");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));
        Organization organization = organizationMembership.getOrganization();
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        User member = organizationMembership.getUser();
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", member.getId());
        userInfo.put("name", member.getName());
        userInfo.put("email", member.getEmail());
        userInfo.put("sub", member.getSub());
        userInfo.put("eduPersonPrincipalName", member.getEduPersonPrincipalName());
        userInfo.put("lastActivity", member.getLastActivity());
        userInfo.put("organizationGUID", member.getOrganizationGUID());

        List<Map<String, Object>> applicationMemberships = organizationMembership.getApplicationMemberships().stream()
                .map(am -> Map.<String, Object>of(
                        "id", am.getId(),
                        "applicationId", am.getApplication().getId(),
                        "applicationName", am.getApplication().getName()))
                .sorted(Comparator.comparing(m -> ((String) m.get("applicationName")).toLowerCase()))
                .toList();

        List<Map<String, Object>> roles = List.of();
        if (!member.isSuperUser() && StringUtils.hasText(member.getSub())) {
            try {
                List<Map<String, Object>> inviteRoles = inviteClient.rolesPerUser(member.getSub());
                roles = inviteRoles != null ? inviteRoles : List.of();
            } catch (RuntimeException e) {
                //Invite can be unavailable, the roles are optional
                LOG.warn("Could not fetch Invite roles for user " + member.getEmail(), e);
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("id", organizationMembership.getId());
        result.put("authority", organizationMembership.getAuthority());
        result.put("createdAt", organizationMembership.getCreatedAt());
        result.put("organizationId", organization.getId());
        result.put("organizationName", organization.getName());
        result.put("manageIdentifier", organization.getManageIdentifier());
        result.put("nbrOfAdmins", getNbrOfAdmins(organizationMembership));
        result.put("user", userInfo);
        result.put("applicationMemberships", applicationMemberships);
        result.put("roles", roles);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping({"/{membership_id}"})
    public ResponseEntity<Map<String, Object>> delete(User user, @PathVariable("membership_id") Long membershipId) {
        LOG.debug("/delete");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));
        Organization organization = organizationMembership.getOrganization();
        //Members are allowed to delete the guests they have invited themselves
        boolean ownGuest = organizationMembership.getAuthority().equals(Authority.GUEST)
                && organizationMembership.getInvitedBy() != null
                && organizationMembership.getInvitedBy().getId().equals(user.getId());
        confirmOrganizationMembership(user, organization, ownGuest ? Authority.MEMBER : Authority.ADMIN);

        long nbrOfAdmins = this.getNbrOfAdmins(organizationMembership);
        if (nbrOfAdmins < 2 && organizationMembership.getAuthority().equals(Authority.ADMIN)) {
            throw new UserRestrictionException("Not allowed to delete last remaining Admin user");
        }
        auditLogger.log(user, organization, AuditCategory.ORGANISATION, AuditAction.MEMBER_REMOVED,
                "user", organizationMembership.getUser().getId(), organizationMembership.getUser().getName(),
                Map.of("authority", organizationMembership.getAuthority().name()));
        organizationMembershipRepository.deleteOrganizationMembershipById(organizationMembership.getId());

        return deleteResult();
    }

    @PutMapping({"", "/"})
    public ResponseEntity<OrganizationMembership> update(User user, @RequestBody OrganizationMembership organizationMembershipUpdate) {
        LOG.debug("/update");
        OrganizationMembership organizationMembership = this.organizationMembershipRepository.findById(organizationMembershipUpdate.getId())
                .orElseThrow(() -> new NotFoundException("OrganizationMembership not found"));

        Authority newAuthority = organizationMembershipUpdate.getAuthority();
        //Changing someone else's authority always requires ADMIN rights - the required authority must never be
        //derived from the client-supplied target value, otherwise a plain MEMBER could demote an ADMIN
        confirmOrganizationMembership(user, organizationMembership.getOrganization(), Authority.ADMIN);

        //Institution admins of an IdP organization are managed in Manage, so no one can be promoted to ADMIN here
        if (newAuthority.equals(Authority.ADMIN)
                && !organizationMembership.getAuthority().equals(Authority.ADMIN)
                && StringUtils.hasText(organizationMembership.getOrganization().getManageIdentifier())) {
            throw new UserRestrictionException("Not allowed to make someone admin of an IdP organization");
        }

        long nbrOfAdmins = this.getNbrOfAdmins(organizationMembership);
        if (nbrOfAdmins < 2 && organizationMembership.getAuthority().equals(Authority.ADMIN) && !newAuthority.isAllowed(Authority.ADMIN)) {
            throw new UserRestrictionException("Not allowed to update last remaining Admin user");
        }

        Authority previousAuthority = organizationMembership.getAuthority();
        organizationMembership.setAuthority(newAuthority);
        organizationMembership = organizationMembershipRepository.save(organizationMembership);
        if (!previousAuthority.equals(newAuthority)) {
            auditLogger.log(user, organizationMembership.getOrganization(), AuditCategory.ORGANISATION,
                    AuditAction.MEMBER_AUTHORITY_CHANGED, "user", organizationMembership.getUser().getId(),
                    organizationMembership.getUser().getName(),
                    Map.of("from", previousAuthority.name(), "to", newAuthority.name()));
        }
        return ResponseEntity.ok(organizationMembership);
    }

    private long getNbrOfAdmins(OrganizationMembership organizationMembership) {
        return organizationMembership.getOrganization().getOrganizationMemberships()
            .stream()
            .filter(om -> om.getAuthority().equals(Authority.ADMIN))
            .count();
    }

}
