package access.api;

import access.exception.InvalidInputException;
import access.exception.UserRestrictionException;
import access.invite.InviteClient;
import access.manage.Manage;
import access.model.Organization;
import access.model.User;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.hypersistence.utils.spring.repository.BaseJpaRepository;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

import static access.manage.Manage.INSTITUTION_GUID;
import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@RestController
@RequestMapping(value = {"/api/v1/invite"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
public class InviteController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(InviteController.class);

    private final InviteClient inviteClient;
    private final Manage manage;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    public InviteController(InviteClient inviteClient,
                            Manage manage,
                            UserRepository userRepository,
                            OrganizationRepository organizationRepository) {
        this.inviteClient = inviteClient;
        this.manage = manage;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
    }

    /*
     * The GUID of the organization is coin:institution_guid of the IdP in Manage. In the Invite domain, every role
     * has an organizationGUID (the coin:institution_guid of the IdP of the institution admin).
     *
     * The applicationManageId is the manage identifier of the Application (e.g., SP or RP)
     */
    @GetMapping("/roles/{organizationGUID}/{applicationManageId}")
    public ResponseEntity<List<Map<String, Object>>> rolesPerOrganizationInviteApplication(
            User user,
            @PathVariable String organizationGUID,
            @PathVariable String applicationManageId) {

        LOG.debug("/rolesPerOrganizationApplicationId");

        User userFromDB = reinitializeUser(user, userRepository);

        if (!userFromDB.isSuperUser() &&
                (!StringUtils.hasText(userFromDB.getOrganizationGUID()) || !StringUtils.hasText(organizationGUID))) {
            LOG.warn("Not fetching invite roles as there is no institution GUID for user: " + user.getEmail());
            return ResponseEntity.ok(List.of());
        }

        if (!userFromDB.isSuperUser() && !organizationGUID.equals(userFromDB.getOrganizationGUID())) {
            throw new UserRestrictionException(
                    String.format("User %s is not authorized for organizationGUID %s",
                            user.getEmail(), organizationGUID));
        }
        boolean noOrganizationGUID = !StringUtils.hasText(organizationGUID) ||
                "undefined".equals(organizationGUID) || "null".equalsIgnoreCase(organizationGUID);
        if (noOrganizationGUID && userFromDB.isSuperUser()) {
            //We use the authenticating authority
            Map<String, Object> identityProvider = manage.identityProviderByEntityID(userFromDB.getAuthenticatingAuthority());
            String idpInstitutionGUID = (String) getMetaDataFields(getData(identityProvider)).get(INSTITUTION_GUID);
            if (StringUtils.hasText(idpInstitutionGUID)) {
                organizationGUID = idpInstitutionGUID;
            } else {
                LOG.warn("Not fetching invite roles as there is no institution GUID for IdP: " + user.getAuthenticatingAuthority());
                return ResponseEntity.ok(List.of());
            }
        }
        if (!applicationManageId.matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
                && !applicationManageId.matches("^\\d+$")) {
            throw new InvalidInputException(
                    String.format("ApplicationManageId %s is not a valid UUID or number", applicationManageId));
        }
        List<Map<String, Object>> inviteRoles = this.inviteClient.rolesPerOrganizationApplicationId(organizationGUID, applicationManageId);
        return ResponseEntity.ok(inviteRoles);
    }


    @GetMapping("/roles-summary")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> rolesSummary(User user, @RequestParam("organizationId") Long organizationId) {
        LOG.debug("/rolesSummary called by: " + user.getEmail());
        Organization organization = organizationRepository.getReferenceById(organizationId);

        confirmInstitutionAdmin(user, organization);

        List<Map<String, Object>> inviteRoles = this.inviteClient.rolesSummary();
        return ResponseEntity.ok(inviteRoles);
    }

}
