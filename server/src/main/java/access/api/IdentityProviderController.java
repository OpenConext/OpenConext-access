package access.api;

import access.exception.InvalidInputException;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.manage.ChangeRequest;
import access.manage.Manage;
import access.manage.PathUpdateType;
import access.manage.RequestType;
import access.model.*;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;
import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@RestController
@RequestMapping(value = {"/api/v1/idp"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class IdentityProviderController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(IdentityProviderController.class);

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final Manage manage;
    private final JiraClient jiraClient;

    public IdentityProviderController(UserRepository userRepository,
                                      OrganizationRepository organizationRepository,
                                      Manage manage,
                                      JiraClient jiraClient) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.manage = manage;
        this.jiraClient = jiraClient;
    }

    @PutMapping({"/connect"})
    public ResponseEntity<Map<String, Object>> connect(User user, @RequestBody @Validated ConnectionRequest connectionRequest) {
        LOG.debug("/connect SP to IdP connection for " + user.getEmail());

        Map<String, Object> serviceProvider = manage.providerById(connectionRequest.getEntityType(),
                connectionRequest.getApplicationManageIdentifier(), Environment.PROD);

        String idpManageIdentifier = connectionRequest.getIdpManageIdentifier();
        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, idpManageIdentifier, Environment.PROD);

        Organization organization = organizationRepository.findByManageIdentifier(idpManageIdentifier)
                .orElseThrow(() -> new NotFoundException("Organization with manageIdentifier not found: " + idpManageIdentifier));

        User userFromDB = reinitializeUser(user, userRepository);
        boolean memberRequest = !userFromDB.isSuperUser();
        if (memberRequest) {
            OrganizationMembership organizationMembership = getOrganizationMembership(userFromDB, organization, Authority.GUEST)
                    .orElseThrow(() -> new NotAllowedException(
                            String.format("User %s is not a member of organization %s", userFromDB.getEmail(), organization.getName())));
            memberRequest = !organizationMembership.getAuthority().equals(Authority.ADMIN);
        }
        if (memberRequest) {
            //The only action is to email the institution admin of the organization, with a deep link to App
            // TODO send email
            return Results.createResult();
        }
        //Now check if the connection can be made automatically
        Map<String, Object> spMetaDataFields = getMetaDataFields(getData(serviceProvider));
        String connectOption = (String) spMetaDataFields.getOrDefault("coin:dashboard_connect_option", "connect_with_interaction");
        String idpInstitutionGUID = (String) getMetaDataFields(getData(identityProvider)).get("coin:institution_guid");

        boolean idpAndSpShareInstitution = spMetaDataFields.getOrDefault("coin:institution_guid", "nope")
                .equals(idpInstitutionGUID);
        boolean connectWithoutInteraction = idpAndSpShareInstitution || !connectOption.equals("connect_with_interaction");
        if (connectWithoutInteraction) {
            manage.connectWithoutInteraction(identityProvider, serviceProvider, userFromDB);
            return Results.createResult();
        }

        String changeRequestURL = manage.changeRequestURLConnectionRequest(EntityType.saml20_idp, idpManageIdentifier);

        String entityId = (String) ((Map) identityProvider.get("data")).get("entityid");
        String lineSeparator = System.lineSeparator();
        String summary = String.format("Connection request requested by %s for %s.",
                user.getName(), serviceProvider);
        String jiraKey = jiraClient.create(new JiraIssue(
                entityId,
                String.format("%s A change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        lineSeparator,
                        changeRequestURL),
                summary,
                EntityType.saml20_idp,
                user.getEmail()
        ));
////        ChangeRequest changeRequest = new ChangeRequest(
////                idpManageIdentifier,
////                EntityType.saml20_idp,
////                //TODO - See idp-dashboard ServicesController#connect
////                Map.of("state", "prodaccepted"),
////                Map.of("user", user.getEmail(),
////                        "notes", String.format("Production status requested by %s for %s. See Jira %s",
////                                user.getName(), connection.getName(), jiraKey)),
////                false,
////                PathUpdateType.ADDITION,
////                RequestType.LinkRequest);
////        Map<String, Object> changeRequestResponse = manage.createChangeRequest(connection.getEnvironment(), changeRequest);
////
//        LOG.debug("Change request response from manage: " + changeRequestResponse);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("status", HttpStatus.CREATED.value(), "jiraKey", jiraKey));
    }


}
