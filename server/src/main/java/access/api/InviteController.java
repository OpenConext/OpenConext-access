package access.api;

import access.exception.InvalidInputException;
import access.exception.UserRestrictionException;
import access.invite.InviteClient;
import access.model.User;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = {"/api/v1/invite"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
public class InviteController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(InviteController.class);

    private final InviteClient inviteClient;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public InviteController(InviteClient inviteClient,
                            OrganizationRepository organizationRepository,
                            UserRepository userRepository) {
        this.inviteClient = inviteClient;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
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
        if (!userFromDB.isSuperUser() && !organizationGUID.equals(userFromDB.getOrganizationGUID())) {
            throw new UserRestrictionException(
                    String.format("User %s is not authorized for organizationGUID %s",
                            user.getEmail(), organizationGUID));
        }
        if (!applicationManageId.matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
                && !applicationManageId.matches("^\\d+$")) {
            throw new InvalidInputException(
                    String.format("ApplicationManageId %s is not a valid UUID or number", applicationManageId));
        }
        List<Map<String, Object>> inviteRoles = this.inviteClient.rolesPerOrganizationApplicationId(organizationGUID, applicationManageId);
        return ResponseEntity.ok(inviteRoles);
    }
}
