package access.security;

import access.exception.UserRestrictionException;
import access.model.User;
import access.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

public class UserHandlerMethodArgumentResolver implements HandlerMethodArgumentResolver {

    private final UserRepository userRepository;
    private final SuperAdmin superAdmin;

    public UserHandlerMethodArgumentResolver(UserRepository userRepository,
                                             SuperAdmin superAdmin) {
        this.userRepository = userRepository;
        this.superAdmin = superAdmin;
    }

    public boolean supportsParameter(MethodParameter methodParameter) {
        return methodParameter.getParameterType().equals(User.class);
    }

    @SuppressWarnings("unchecked")
    public User resolveArgument(MethodParameter methodParameter,
                                ModelAndViewContainer mavContainer,
                                NativeWebRequest webRequest,
                                WebDataBinderFactory binderFactory) {
        Principal userPrincipal = webRequest.getUserPrincipal();
        Map<String, Object> attributes;

        HttpServletRequest request = ((ServletWebRequest) webRequest).getRequest();
        String requestURI = request.getRequestURI();

        if (userPrincipal instanceof BearerTokenAuthentication bearerTokenAuthentication) {
            //The user has logged in and got an access_token. Access is acting as an API resource server
            attributes = bearerTokenAuthentication.getTokenAttributes();
        } else if (userPrincipal instanceof OAuth2AuthenticationToken authenticationToken) {
            //The user has logged in with OpenIDConnect. Access is acting as a backend server
            attributes = authenticationToken.getPrincipal().getAttributes();
        } else if (requestURI.equals("/api/v1/users/config") || requestURI.startsWith("/api/v1/stats/loginTimeFrame")) {
            //This call is always allowed
            return null;
        } else {
            throw new UserRestrictionException("Forbidden");
        }

        String sub = attributes.get("sub").toString();
        Optional<User> optionalUser = userRepository.findBySubIgnoreCase(sub)
                .or(() ->
                        //Provision super-admin users on the fly
                        superAdmin.getUsers().stream().filter(adminSub -> adminSub.equals(sub))
                                .findFirst()
                                .map(adminSub -> userRepository.save(new User(true, attributes)))
                )
                .or(() -> {
                    User user = new User(attributes);
                    userRepository.save(user);
                    return Optional.of(user);
                });
        User user = optionalUser.orElseThrow(() -> new UserRestrictionException("Forbidden"));
        if (userPrincipal instanceof OAuth2AuthenticationToken authenticationToken) {
            String acr = (String) authenticationToken.getPrincipal().getAttributes()
                    .getOrDefault("acr", "urn:oasis:names:tc:SAML:2.0:ac:classes:Password");
            user.setLoaLevel(convertLoaLevel(acr));
        }
        String impersonateId = webRequest.getHeader("X-IMPERSONATE-ID");
        if (StringUtils.hasText(impersonateId) && user.isSuperUser()) {
            return userRepository.findById(Long.valueOf(impersonateId))
                    .orElseThrow(() -> new UserRestrictionException("Forbidden"));
        }
        return user;
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