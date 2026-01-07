package access.api;

import access.config.Config;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.mail.MailBox;
import access.manage.Manage;
import access.model.*;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import access.security.InstitutionAdmin;
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
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.view.RedirectView;

import java.util.*;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/users"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@EnableConfigurationProperties(Config.class)
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class UserController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(UserController.class);

    private final Config config;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final Manage manage;
    private final MailBox mailBox;

    @Autowired
    public UserController(Config config,
                          UserRepository userRepository,
                          OrganizationRepository organizationRepository, Manage manage, MailBox mailBox) {
        this.config = config;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.manage = manage;
        this.mailBox = mailBox;
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

    @GetMapping("login")
    public View login() {
        LOG.debug("/login");
        return new RedirectView(config.getClientUrl(), false);
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(@Parameter(hidden = true) User user, Authentication authentication) {
        LOG.debug(String.format("/me for user %s", user.getEduPersonPrincipalName()));

        User userFromDB = userRepository.findDetailsById(user.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        String schacHomeOrganization = userFromDB.getSchacHomeOrganization();
        boolean isExternalUserFromSchacHome = schacHomeOrganization.equals(config.getEduIdSchacHomeOrganization());
        userFromDB.setExternalUser(isExternalUserFromSchacHome);
        if (!isExternalUserFromSchacHome) {
            OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
            Map<String, Object> claims = oidcUser.getUserInfo().getClaims();
            String authenticatingAuthority = (String) claims.get("authenticating_authority");
            Map<String, Object> identityProvider = manage.identityProviderByEntityID(authenticatingAuthority);
            String manageIdentifier = (String) identityProvider.get("_id");
            userFromDB.setIdentityProvider(identityProvider);
            String obtainedAcr = (String) claims.getOrDefault("acr", "urn:oasis:names:tc:SAML:2.0:ac:classes:Password");
            userFromDB.setLoaLevel(this.convertLoaLevel(obtainedAcr));

            // Provision the user into the organization, if no organization is created yet, create it on the fly
            if (userFromDB.getOrganizationMemberships().stream()
                    .noneMatch(organizationMembership -> organizationMembership.getOrganization()
                            .getManageIdentifier().equals(manageIdentifier))) {
                Optional<Organization> organizationOptional = organizationRepository.findByManageIdentifier(manageIdentifier);
                Institution institution = (Institution) claims.getOrDefault(InstitutionAdmin.INSTITUTION, null);
                userFromDB.setInstitution(institution);
                Authority authority = userFromDB.isInstitutionAdmin() && institution != null ? Authority.ADMIN : Authority.MEMBER;
                organizationOptional.ifPresentOrElse(
                        organization -> {
                            userFromDB.addOrganizationMembership(new OrganizationMembership(userFromDB, organization, authority));
                        }, () -> {
                            Institution institutionForOrg = Objects.isNull(institution) ? new Institution(identityProvider) : institution;
                            String organizationName = String.format("%s (%s)", institutionForOrg.getName(), institutionForOrg.getOrganizationName());
                            Integer manageVersion = (Integer) identityProvider.get("version");
                            Organization organization = new Organization(organizationName, schacHomeOrganization, manageIdentifier, manageVersion);
                            //Organizations created based on the IdP's in Manage are approved automatically
                            organization.setStatus(OrganizationStatus.APPROVED);
                            organizationRepository.save(organization);
                            userFromDB.addOrganizationMembership(new OrganizationMembership(userFromDB, organization, authority));
                        }
                );
            }
        }
        userRepository.save(userFromDB);
        return ResponseEntity.ok(userFromDB);
    }

    @GetMapping("/other/{id}")
    public ResponseEntity<User> details(@PathVariable("id") Long id, @Parameter(hidden = true) User user) {
        LOG.debug(String.format("/other/%s for user %s", id, user.getEduPersonPrincipalName()));

        if (!user.isSuperUser()) {
            throw new NotAllowedException("Not allowed endpoint by" + user);
        }
        User other = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        return ResponseEntity.ok(other);
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteMe(@Parameter(hidden = true) User user) {
        LOG.debug(String.format("/delete for user %s", user.getEduPersonPrincipalName()));

        User userFromDB = userRepository.findDetailsById(user.getId())
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
        Page<Map<String, Object>> usersPage = StringUtils.hasText(query) ? userRepository.searchByPageWithKeyword(FullSearchQueryParser.parse(query), pageable):
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
