package access.api;

import access.config.Config;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.mail.MailBox;
import access.manage.Manage;
import access.model.Authority;
import access.model.EntityType;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.OrganizationStatus;
import access.model.User;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.view.RedirectView;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@RestController
@RequestMapping(value = {"/api/v1/users"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@EnableConfigurationProperties(Config.class)
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
@SuppressWarnings("unchecked")
public class UserController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(UserController.class);

    private final Config config;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final Manage manage;
    private final MailBox mailBox;
    private final ObjectMapper objectMapper;

    @Autowired
    public UserController(Config config,
                          UserRepository userRepository,
                          OrganizationRepository organizationRepository, Manage manage, MailBox mailBox, ObjectMapper objectMapper) {
        this.config = config;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.manage = manage;
        this.mailBox = mailBox;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/config")
    public ResponseEntity<Config> config(User user) {
        LOG.debug("/config");
        Config result = new Config(this.config);
        result
            .withAuthenticated(user != null && user.getId() != null)
            .withName(user != null ? user.getName() : null)
            .withStats(manage.stats());
        if (user != null) {
            verifyMissingAttributes(user, result);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/login")
    public View login() {
        LOG.debug("/login");
        return new RedirectView(config.getClientUrl(), false);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@Parameter(hidden = true) User user, Authentication authentication) {
        LOG.debug(String.format("/me for user %s", user.getEduPersonPrincipalName()));

        User userFromDB = userRepository.findDetailsById(user.getId())
            .orElseThrow(() -> new NotFoundException("User not found"));

        String schacHomeOrganization = userFromDB.getSchacHomeOrganization();
        boolean isExternalUserFromSchacHome = config.getExternalSchacHomeOrganizations().contains(schacHomeOrganization);

        LOG.debug(String.format("/me for user from %s is guest: %s", schacHomeOrganization, isExternalUserFromSchacHome));

        userFromDB.setExternalUser(isExternalUserFromSchacHome);
        if (!isExternalUserFromSchacHome) {
            OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
            Map<String, Object> claims = oidcUser.getUserInfo().getClaims();

            String obtainedAcr = (String) claims.getOrDefault("acr", "urn:oasis:names:tc:SAML:2.0:ac:classes:Password");
            userFromDB.setLoaLevel(this.convertLoaLevel(obtainedAcr));

            String surfCrmId = (String) claims.get("surf-crm-id");
            if (!StringUtils.hasText(surfCrmId)) {
                //For now raise exception
                throw new NotAllowedException(String.format("No surf-crm-id in user attributes %s. Check the ARP",
                    claims));
            }
            List<Map<String, Object>> identityProviders = manage.identityProvidersByInstitutionalGUID(surfCrmId);
            if (CollectionUtils.isEmpty(identityProviders)) {
                //For now raise exception
                throw new NotAllowedException(String.format("No IdP found for user %s and surf-crm-id %s",
                    userFromDB.getEmail(), surfCrmId));
            }
            // Provision the user into the organization(s), this is only done once for a user
            List<String> existingOrgMembershipIdentifiers = userFromDB.getOrganizationMemberships().stream()
                .map(organizationMembership -> organizationMembership.getOrganization().getManageIdentifier())
                .toList();
            identityProviders.stream()
                .filter(idp -> !existingOrgMembershipIdentifiers.contains((String) idp.get("_id")))
                .forEach(idp -> {
                    String manageIdentifier = (String) idp.get("_id");
                    Optional<Organization> organizationOptional = organizationRepository.findByManageIdentifier(manageIdentifier);
                    Authority authority = userFromDB.isInstitutionAdmin() ? Authority.ADMIN : Authority.MEMBER;
                    organizationOptional.ifPresentOrElse(
                        organization -> {
                            userFromDB.addOrganizationMembership(new OrganizationMembership(userFromDB, organization, authority));
                        }, () -> {
                            // If no organization is created yet, create it on the fly. This is only done once per organization
                            Map<String, Object> metaDataFields = getMetaDataFields(getData(idp));
                            String organizationName = String.format("%s (%s)",
                                metaDataFields.get("name:en"),
                                metaDataFields.get("OrganizationName:en"));
                            Integer manageVersion = (Integer) idp.get("version");
                            Organization organization = new Organization(organizationName, schacHomeOrganization, manageIdentifier, manageVersion);
                            //Organizations created based on the IdP's in Manage are approved automatically
                            organization.setStatus(OrganizationStatus.APPROVED);
                            organizationRepository.save(organization);
                            userFromDB.addOrganizationMembership(new OrganizationMembership(userFromDB, organization, authority));
                        }
                    );
                });
        }
        userRepository.save(userFromDB);
        Map<String, Object> userMap = objectMapper.convertValue(userFromDB, new TypeReference<>() {
        });
        List<Map<String, Object>> organizationMemberships = (List<Map<String, Object>>) userMap.getOrDefault("organizationMemberships", List.of());
        organizationMemberships.forEach(organizationMembership -> {
            Map<String, Object> organization = (Map<String, Object>) organizationMembership.get("organization");
            String manageIdentifier = (String) organization.get("manageIdentifier");
            if (StringUtils.hasText(manageIdentifier)) {
                Map<String, Object> identityProvider = manage.providerByManageIdentifier(EntityType.saml20_idp, manageIdentifier);
                organization.put("identityProvider", identityProvider);
                List<Map<String, Object>> changeRequests = manage.getChangeRequestsIdentityProvider(identityProvider);
                organization.put("changeRequests", changeRequests);
            }
        });

        return ResponseEntity.ok(userMap);
    }

    @GetMapping("/other/{id}")
    public ResponseEntity<User> details(@PathVariable("id") Long id, @Parameter(hidden = true) User user) {
        LOG.debug(String.format("/other/%s for user %s", id, user.getEduPersonPrincipalName()));

        if (!user.isSuperUser()) {
            throw new NotAllowedException("Not allowed endpoint by " + user.getEmail());
        }
        User other = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        return ResponseEntity.ok(other);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> deleteMe(@Parameter(hidden = true) User user, @PathVariable Long userId) {
        LOG.debug(String.format("/delete for user %s", user.getEduPersonPrincipalName()));

        confirmSuperUser(user);

        User userFromDB = userRepository.findDetailsById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));
        userRepository.delete(userFromDB);

        return Results.deleteResult();
    }

    @GetMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request) {
        LOG.debug("/logout");
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return Results.okResult();
    }

    @PostMapping("/feedback")
    public ResponseEntity<Map<String, Object>> feedback(User user, @RequestBody Map<String, String> body) {
        LOG.debug("/feedback from " + user.getEmail());
        String message = body.get("message");
        if (StringUtils.hasText(message)) {
            mailBox.sendFeedbackMail(user, message);
        }
        return Results.okResult();
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Map<String, Object>>> search(@Parameter(hidden = true) User user,
                                                            @RequestParam(value = "query", required = false, defaultValue = "") String query,
                                                            @RequestParam(value = "pageNumber", required = false, defaultValue = "0") int pageNumber,
                                                            @RequestParam(value = "pageSize", required = false, defaultValue = "10") int pageSize,
                                                            @RequestParam(value = "sort", required = false, defaultValue = "name") String sort,
                                                            @RequestParam(value = "sortDirection", required = false, defaultValue = "ASC") String sortDirection) {
        LOG.debug(String.format("/search for user %s", user.getEduPersonPrincipalName()));

        confirmSuperUser(user);

        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.fromString(sortDirection), sort));
        Page<Map<String, Object>> usersPage = StringUtils.hasText(query) ? userRepository.searchByPageWithKeyword(FullSearchQueryParser.parse(query), pageable) :
            userRepository.searchByPage(pageable);
        return ResponseEntity.ok(usersPage);
    }

    private void verifyMissingAttributes(User user, Config result) {
        List<String> missingAttributes = new ArrayList<>();
        if (!StringUtils.hasText(user.getEmail())) {
            missingAttributes.add("email");
        }
        if (!StringUtils.hasText(user.getSchacHomeOrganization())) {
            missingAttributes.add("schacHomeOrganization");
        }
        if (!StringUtils.hasText(user.getFamilyName())) {
            missingAttributes.add("familyName");
        }
        if (!StringUtils.hasText(user.getGivenName())) {
            missingAttributes.add("givenName");
        }
        if (!missingAttributes.isEmpty()) {
            result.withMissingAttributes(missingAttributes);
        }
    }

    private int convertLoaLevel(String acr) {
        if (!StringUtils.hasText(acr) || acr.trim().toLowerCase().endsWith("password")) {
            return 1;
        }
        try {
            int loa = Integer.parseInt(acr.substring(acr.length() - 1));
            //Corner case for 1.5
            return loa == 5 ? 1 : loa;
        } catch (NumberFormatException e) {
            return 1;
        }
    }


}
