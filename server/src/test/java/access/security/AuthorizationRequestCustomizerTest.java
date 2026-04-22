package access.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.savedrequest.DefaultSavedRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthorizationRequestCustomizerTest {

    private static final List<String> EDUID_IDP_IDENTIFIERS = List.of("https://eduid.nl/saml-idp");
    private static final String STEPUP_ACR = "https://eduid.nl/assurance/loa2";

    private AuthorizationRequestCustomizer customizer;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        customizer = new AuthorizationRequestCustomizer(EDUID_IDP_IDENTIFIERS, STEPUP_ACR);
        request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private OAuth2AuthorizationRequest.Builder builder() {
        return OAuth2AuthorizationRequest.authorizationCode()
                .clientId("client")
                .authorizationUri("https://auth.example.com/oauth2/authorize");
    }

    private Map<String, Object> buildAdditionalParams(OAuth2AuthorizationRequest.Builder b) {
        return b.build().getAdditionalParameters();
    }

    // ── no session ────────────────────────────────────────────────────────────

    @Test
    void noSession_noParamsAdded() {
        // MockHttpServletRequest.getSession(false) returns null when no session was created
        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        Map<String, Object> params = buildAdditionalParams(b);
        assertFalse(params.containsKey("prompt"));
        assertFalse(params.containsKey("login_hint"));
        assertFalse(params.containsKey("acr_values"));
    }

    // ── session present but no SPRING_SECURITY_SAVED_REQUEST ─────────────────

    @Test
    void sessionWithoutSavedRequest_noParamsAdded() {
        request.getSession(true); // creates a session but puts nothing in it

        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        Map<String, Object> params = buildAdditionalParams(b);
        assertFalse(params.containsKey("prompt"));
        assertFalse(params.containsKey("login_hint"));
        assertFalse(params.containsKey("acr_values"));
    }

    // ── force parameter ───────────────────────────────────────────────────────

    @Test
    void forceParam_addsPromptLogin() {
        DefaultSavedRequest savedRequest = mock(DefaultSavedRequest.class);
        when(savedRequest.getParameterValues("force")).thenReturn(new String[]{"true"});
        when(savedRequest.getParameterValues("eduId")).thenReturn(null);
        when(savedRequest.getParameterValues("upgradeLoa")).thenReturn(null);
        request.getSession(true).setAttribute("SPRING_SECURITY_SAVED_REQUEST", savedRequest);

        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        Map<String, Object> params = buildAdditionalParams(b);
        assertEquals("login", params.get("prompt"));
        assertFalse(params.containsKey("login_hint"));
        assertFalse(params.containsKey("acr_values"));
    }

    @Test
    void forceParamWithMultipleValues_notAdded() {
        // Only a single-element array triggers the parameter
        DefaultSavedRequest savedRequest = mock(DefaultSavedRequest.class);
        when(savedRequest.getParameterValues("force")).thenReturn(new String[]{"a", "b"});
        when(savedRequest.getParameterValues("eduId")).thenReturn(null);
        when(savedRequest.getParameterValues("upgradeLoa")).thenReturn(null);
        request.getSession(true).setAttribute("SPRING_SECURITY_SAVED_REQUEST", savedRequest);

        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        assertFalse(buildAdditionalParams(b).containsKey("prompt"));
    }

    // ── eduId parameter ───────────────────────────────────────────────────────

    @Test
    void eduIdParam_addsLoginHint() {
        DefaultSavedRequest savedRequest = mock(DefaultSavedRequest.class);
        when(savedRequest.getParameterValues("force")).thenReturn(null);
        when(savedRequest.getParameterValues("eduId")).thenReturn(new String[]{"true"});
        when(savedRequest.getParameterValues("upgradeLoa")).thenReturn(null);
        request.getSession(true).setAttribute("SPRING_SECURITY_SAVED_REQUEST", savedRequest);

        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        Map<String, Object> params = buildAdditionalParams(b);
        assertEquals(EDUID_IDP_IDENTIFIERS.getFirst(), params.get("login_hint"));
        assertFalse(params.containsKey("prompt"));
        assertFalse(params.containsKey("acr_values"));
    }

    // ── upgradeLoa parameter ──────────────────────────────────────────────────

    @Test
    void upgradeLoaParam_addsAcrValues() {
        DefaultSavedRequest savedRequest = mock(DefaultSavedRequest.class);
        when(savedRequest.getParameterValues("force")).thenReturn(null);
        when(savedRequest.getParameterValues("eduId")).thenReturn(null);
        when(savedRequest.getParameterValues("upgradeLoa")).thenReturn(new String[]{"true"});
        request.getSession(true).setAttribute("SPRING_SECURITY_SAVED_REQUEST", savedRequest);

        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        Map<String, Object> params = buildAdditionalParams(b);
        assertEquals(STEPUP_ACR, params.get("acr_values"));
        assertFalse(params.containsKey("prompt"));
        assertFalse(params.containsKey("login_hint"));
    }

    // ── all three parameters at once ──────────────────────────────────────────

    @Test
    void allThreeParams_addsAll() {
        DefaultSavedRequest savedRequest = mock(DefaultSavedRequest.class);
        when(savedRequest.getParameterValues("force")).thenReturn(new String[]{"true"});
        when(savedRequest.getParameterValues("eduId")).thenReturn(new String[]{"true"});
        when(savedRequest.getParameterValues("upgradeLoa")).thenReturn(new String[]{"true"});
        request.getSession(true).setAttribute("SPRING_SECURITY_SAVED_REQUEST", savedRequest);

        OAuth2AuthorizationRequest.Builder b = builder();
        customizer.accept(b);

        Map<String, Object> params = buildAdditionalParams(b);
        assertEquals("login", params.get("prompt"));
        assertEquals(EDUID_IDP_IDENTIFIERS.getFirst(), params.get("login_hint"));
        assertEquals(STEPUP_ACR, params.get("acr_values"));
    }
}
