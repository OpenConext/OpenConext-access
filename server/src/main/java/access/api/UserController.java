package access.api;

import access.config.Config;
import access.exception.NotAllowedException;
import access.exception.NotFoundException;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
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
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.view.RedirectView;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/users"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@EnableConfigurationProperties(Config.class)
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class UserController {

    private static final Log LOG = LogFactory.getLog(UserController.class);

    private final Config config;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    @Autowired
    public UserController(Config config,
                          UserRepository userRepository,
                          OrganizationRepository organizationRepository) throws IOException {
        this.config = config;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
    }

    @GetMapping("config")
    public ResponseEntity<Config> config(User user,
                                         @RequestParam(value = "guest", required = false, defaultValue = "false") boolean guest) {
        LOG.debug("/config");
        Config result = new Config(this.config);
        result
                .withAuthenticated(user != null && user.getId() != null)
                .withName(user != null ? user.getName() : null);
        if (user != null) {
            verifyMissingAttributes(user, result, guest);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("login")
    public View login() {
        LOG.debug("/login");
        return new RedirectView(config.getClientUrl(), false);
    }


    @GetMapping("/me")
    public ResponseEntity<User> me(@Parameter(hidden = true) User user) {
        LOG.debug(String.format("/me for user %s", user.getEduPersonPrincipalName()));

        User userFromDB = userRepository.findDetailsById(user.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        String schacHomeOrganization = userFromDB.getSchacHomeOrganization();
        if (userFromDB.getOrganizationMemberships().isEmpty() &&
                !schacHomeOrganization.equals(config.getEduIdSchacHomeOrganization())) {
            Optional<Organization> organizationOptional = organizationRepository.findBySchacHomeOrganization(schacHomeOrganization);
            organizationOptional.ifPresent(organization -> {
                userFromDB.addOrganizationMembership(new OrganizationMembership(userFromDB, organization, Authority.MEMBER));
                userRepository.save(userFromDB);
            });
        }
        /*
         * In this case only, we do want the organization for each membership. We don't want to do this EAGER for
         * every membership, so we need to re-fetch within this transaction. The performance overhead is ok, as users
         * normally are only member of one organization
         */
        userFromDB.getOrganizationMemberships()
                .forEach(organizationMembership -> organizationMembership.getOrganization().getName());

        return ResponseEntity.ok(userFromDB);
    }

    @GetMapping("other/{id}")
    public ResponseEntity<User> details(@PathVariable("id") Long id, @Parameter(hidden = true) User user) {
        LOG.debug(String.format("/other/%s for user $s", id, user.getEduPersonPrincipalName()));

        if (!user.isSuperUser()) {
            throw new NotAllowedException("Not allowed endpoint by" + user);
        }
        User other = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        return ResponseEntity.ok(other);
    }

    @GetMapping("logout")
    public ResponseEntity<Map<String, Integer>> logout(HttpServletRequest request) {
        LOG.debug("/logout");
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return Results.okResult();
    }

    private void verifyMissingAttributes(User user, Config result, boolean guest) {
        List<String> missingAttributes = new ArrayList<>();
        if (!StringUtils.hasText(user.getSub())) {
            missingAttributes.add("sub");
        }
        if (!StringUtils.hasText(user.getEmail())) {
            missingAttributes.add("email");
        }
        if (!StringUtils.hasText(user.getSchacHomeOrganization())) {
            missingAttributes.add("schacHomeOrganization");
        }
        if (guest && !StringUtils.hasText(user.getFamilyName())) {
            missingAttributes.add("familyName");
        }
        if (guest && !StringUtils.hasText(user.getGivenName())) {
            missingAttributes.add("givenName");
        }
        if (!missingAttributes.isEmpty()) {
            result.withMissingAttributes(missingAttributes);
        }
    }


}
