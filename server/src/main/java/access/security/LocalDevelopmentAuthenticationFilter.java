package access.security;

import jakarta.servlet.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class LocalDevelopmentAuthenticationFilter implements Filter {

    private static final String sub = "urn:collab:person:eduid.nl:mos6";
    //    private final String sub = "urn:collab:person:example.com:admin";
    private static final String schacHomeOrganization = "example6.com";

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            LocalDevelopmentAuthenticationFilter.populateSecurityContext(Map.of());
        }
        filterChain.doFilter(servletRequest, servletResponse);
    }

    public static void populateSecurityContext(Map<String, String> body) {
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("OPENID"));
        Map<String, Object> defaultClaims = Map.of(
                "eduperson_principal_name", "urn:collab:person:example.com:super",
                "email", "jdoe@example.com",
                "family_name", "Doe",
                "given_name", "John",
                "name", "John Doe",
                "schac_home_organization", schacHomeOrganization,
                "scope", "openid",
                "sub", body.getOrDefault("sub", LocalDevelopmentAuthenticationFilter.sub),
                "uids", List.of("super"));
        //We can't rely on the mutability of the body
        Map<String, Object> claims = new HashMap<>(defaultClaims);
        claims.putAll(body);

        OidcIdToken idToken = new OidcIdToken(
                UUID.randomUUID().toString(),
                Instant.now(),
                Instant.now().plus(1, ChronoUnit.HOURS),
                claims
        );
        OidcUserInfo userInfo = new OidcUserInfo(claims);
        DefaultOidcUser oidcUser = new DefaultOidcUser(authorities, idToken, userInfo);
        OAuth2AuthenticationToken authenticationToken = new OAuth2AuthenticationToken(
                oidcUser,
                authorities,
                "oidcng"
        );
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
    }
}
