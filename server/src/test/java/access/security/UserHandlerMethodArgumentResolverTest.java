package access.security;

import access.exception.UserRestrictionException;
import access.model.User;
import access.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.web.context.request.ServletWebRequest;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.security.UserHandlerMethodArgumentResolver.X_IMPERSONATE_ID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserHandlerMethodArgumentResolverTest {

    private UserRepository userRepository;
    private SuperAdmin superAdmin;
    private UserHandlerMethodArgumentResolver resolver;

    // A minimal set of attributes that satisfy the User(Map) constructor
    private static final Map<String, Object> ATTRIBUTES = Map.of(
            "sub", "urn:collab:person:example.com:john",
            "email", "john@example.com",
            "given_name", "John",
            "family_name", "Doe",
            "uids", List.of("john")
    );

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        superAdmin = new SuperAdmin();
        superAdmin.setUsers(List.of("urn:collab:person:example.com:super"));
        resolver = new UserHandlerMethodArgumentResolver(userRepository, superAdmin);
    }

    // helper: build a MethodParameter typed to User
    private MethodParameter userParameter() throws Exception {
        Method method = getClass().getDeclaredMethod("dummyMethod", User.class);
        return new MethodParameter(method, 0);
    }

    // helper: build a MethodParameter typed to String (non-User)
    private MethodParameter stringParameter() throws Exception {
        Method method = getClass().getDeclaredMethod("dummyStringMethod", String.class);
        return new MethodParameter(method, 0);
    }

    @SuppressWarnings("unused")
    private void dummyMethod(User user) {}
    @SuppressWarnings("unused")
    private void dummyStringMethod(String s) {}

    // ── supportsParameter ────────────────────────────────────────────────────

    @Test
    void supportsParameter_userType_returnsTrue() throws Exception {
        assertTrue(resolver.supportsParameter(userParameter()));
    }

    @Test
    void supportsParameter_nonUserType_returnsFalse() throws Exception {
        assertFalse(resolver.supportsParameter(stringParameter()));
    }

    // ── resolveArgument: no principal + config URL → null ────────────────────

    @Test
    void resolveArgument_noPrincipal_configUrl_returnsNull() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users/config");
        ServletWebRequest webRequest = new ServletWebRequest(request);

        User result = resolver.resolveArgument(userParameter(), null, webRequest, null);
        assertNull(result);
    }

    // ── resolveArgument: no principal + other URL → exception ────────────────

    @Test
    void resolveArgument_noPrincipal_otherUrl_throwsUserRestrictionException() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        ServletWebRequest webRequest = new ServletWebRequest(request);

        assertThrows(UserRestrictionException.class,
                () -> resolver.resolveArgument(userParameter(), null, webRequest, null));
    }

    // ── resolveArgument: BearerTokenAuthentication, user exists ─────────────

    @Test
    void resolveArgument_bearerToken_existingUser() throws Exception {
        User existingUser = new User(ATTRIBUTES);
        when(userRepository.findBySubIgnoreCase("urn:collab:person:example.com:john"))
                .thenReturn(Optional.of(existingUser));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.setUserPrincipal(bearerTokenAuthentication(ATTRIBUTES));
        ServletWebRequest webRequest = new ServletWebRequest(request);

        User result = resolver.resolveArgument(userParameter(), null, webRequest, null);
        assertSame(existingUser, result);
        verify(userRepository, never()).save(any());
    }

    // ── resolveArgument: OAuth2AuthenticationToken, user exists ─────────────

    @Test
    void resolveArgument_oauth2Token_existingUser() throws Exception {
        User existingUser = new User(ATTRIBUTES);
        when(userRepository.findBySubIgnoreCase("urn:collab:person:example.com:john"))
                .thenReturn(Optional.of(existingUser));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.setUserPrincipal(oauth2AuthenticationToken(ATTRIBUTES));
        ServletWebRequest webRequest = new ServletWebRequest(request);

        User result = resolver.resolveArgument(userParameter(), null, webRequest, null);
        assertSame(existingUser, result);
    }

    // ── resolveArgument: unknown sub → auto-provision regular user ───────────

    @Test
    void resolveArgument_unknownSub_provisionsNewUser() throws Exception {
        when(userRepository.findBySubIgnoreCase(any())).thenReturn(Optional.empty());
        User saved = new User(ATTRIBUTES);
        when(userRepository.save(any(User.class))).thenReturn(saved);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.setUserPrincipal(bearerTokenAuthentication(ATTRIBUTES));
        ServletWebRequest webRequest = new ServletWebRequest(request);

        User result = resolver.resolveArgument(userParameter(), null, webRequest, null);
        assertNotNull(result);
        verify(userRepository).save(any(User.class));
    }

    // ── resolveArgument: super-admin sub → provisioned as superUser ──────────

    @Test
    void resolveArgument_superAdminSub_provisionedAsSuperUser() throws Exception {
        Map<String, Object> superAttrs = Map.of(
                "sub", "urn:collab:person:example.com:super",
                "email", "super@example.com",
                "uids", List.of()
        );
        when(userRepository.findBySubIgnoreCase("urn:collab:person:example.com:super"))
                .thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.setUserPrincipal(bearerTokenAuthentication(superAttrs));
        ServletWebRequest webRequest = new ServletWebRequest(request);

        User result = resolver.resolveArgument(userParameter(), null, webRequest, null);
        assertNotNull(result);
        assertTrue(result.isSuperUser());
    }

    // ── resolveArgument: impersonation by superUser ───────────────────────────

    @Test
    void resolveArgument_impersonation_superUserImpersonatesOtherUser() throws Exception {
        User superUser = new User(true, ATTRIBUTES);
        User impersonated = new User(Map.of(
                "sub", "urn:collab:person:example.com:other",
                "email", "other@example.com",
                "uids", List.of()
        ));
        impersonated.setId(42L);
        when(userRepository.findBySubIgnoreCase("urn:collab:person:example.com:john"))
                .thenReturn(Optional.of(superUser));
        when(userRepository.findById(42L)).thenReturn(Optional.of(impersonated));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.addHeader(X_IMPERSONATE_ID, "42");
        request.setUserPrincipal(bearerTokenAuthentication(ATTRIBUTES));
        ServletWebRequest webRequest = new ServletWebRequest(request);

        User result = resolver.resolveArgument(userParameter(), null, webRequest, null);
        assertSame(impersonated, result);
    }

    // ── resolveArgument: impersonation by non-superUser → returns self ────────

    @Test
    void resolveArgument_impersonationHeader_nonSuperUser_throwsException() throws Exception {
        User regularUser = new User(ATTRIBUTES); // superUser=false
        when(userRepository.findBySubIgnoreCase("urn:collab:person:example.com:john"))
                .thenReturn(Optional.of(regularUser));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.addHeader(X_IMPERSONATE_ID, "42");
        request.setUserPrincipal(bearerTokenAuthentication(ATTRIBUTES));
        ServletWebRequest webRequest = new ServletWebRequest(request);
        assertThrows(UserRestrictionException.class,
            () -> resolver.resolveArgument(userParameter(), null, webRequest, null));
    }

    // ── resolveArgument: impersonation with non-existent id → exception ───────

    @Test
    void resolveArgument_impersonation_unknownTargetId_throwsException() throws Exception {
        User superUser = new User(true, ATTRIBUTES);
        when(userRepository.findBySubIgnoreCase("urn:collab:person:example.com:john"))
                .thenReturn(Optional.of(superUser));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/organizations");
        request.addHeader(X_IMPERSONATE_ID, "99");
        request.setUserPrincipal(bearerTokenAuthentication(ATTRIBUTES));
        ServletWebRequest webRequest = new ServletWebRequest(request);

        assertThrows(UserRestrictionException.class,
                () -> resolver.resolveArgument(userParameter(), null, webRequest, null));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private BearerTokenAuthentication bearerTokenAuthentication(Map<String, Object> attributes) {
        OAuth2AuthenticatedPrincipal principal = mock(OAuth2AuthenticatedPrincipal.class);
        when(principal.getAttributes()).thenReturn(attributes);
        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER, "token", Instant.now(), Instant.now().plusSeconds(3600));
        BearerTokenAuthentication auth = new BearerTokenAuthentication(principal, accessToken, List.of());
        return auth;
    }

    private OAuth2AuthenticationToken oauth2AuthenticationToken(Map<String, Object> attributes) {
        OidcIdToken idToken = OidcIdToken.withTokenValue("id-token")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject((String) attributes.get("sub"))
                .claims(c -> c.putAll(attributes))
                .build();
        DefaultOidcUser oidcUser = new DefaultOidcUser(
                List.of(new OidcUserAuthority(idToken)), idToken);
        return new OAuth2AuthenticationToken(oidcUser, List.of(), "oidcng");
    }
}
