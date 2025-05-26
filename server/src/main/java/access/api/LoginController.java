package access.api;

import access.exception.NotAllowedException;
import access.security.LocalDevelopmentAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping(value = {"/api/v1/test"}, produces = MediaType.APPLICATION_JSON_VALUE)
public class LoginController {

    private final Environment environment;
    private final SecurityContextRepository securityContextRepository;

    public LoginController(Environment environment, SecurityContextRepository securityContextRepository) {
        this.environment = environment;
        this.securityContextRepository = securityContextRepository;
    }

    @PutMapping("/login")
    public ResponseEntity<Void> login(@RequestBody Map<String, String> body,
                                      HttpServletRequest servletRequest,
                                      HttpServletResponse servletResponse) {
        if (!environment.acceptsProfiles(Profiles.of("test"))) {
            throw new NotAllowedException("Not allowed");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
            LocalDevelopmentAuthenticationFilter.populateSecurityContext(body.get("sub"));
        }
        //New in Spring security 6.x,
        // See https://docs.spring.io/spring-security/reference/5.8/migration/servlet/session-management.html#_require_explicit_saving_of_securitycontextrepository
        securityContextRepository.saveContext(SecurityContextHolder.getContext(), servletRequest, servletResponse);

        return ResponseEntity.status(HttpStatusCode.valueOf(201)).build();
    }

}
