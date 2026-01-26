package access.security;

import access.manage.Manage;
import access.model.Environment;
import access.model.Institution;
import access.model.User;
import access.repository.UserRepository;
import lombok.Getter;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.security.InstitutionAdmin.*;

@SuppressWarnings({"unchecked", "unsafe"})
public class CustomOidcUserService implements OAuth2UserService<OidcUserRequest, OidcUser> {

    private static final Log LOG = LogFactory.getLog(CustomOidcUserService.class);

    @Getter
    private final UserRepository userRepository;
    private final OidcUserService delegate;
    private final Manage manage;
    private final String entitlement;
    private final String organizationGuidPrefix;

    public CustomOidcUserService(UserRepository userRepository,
                                 Manage manage,
                                 String entitlement,
                                 String organizationGuidPrefix) {
        this.userRepository = userRepository;
        this.manage = manage;
        this.entitlement = entitlement;
        this.organizationGuidPrefix = organizationGuidPrefix;
        delegate = new OidcUserService();
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        // Delegate to the default implementation for loading a user
        OidcUser oidcUser = delegate.loadUser(userRequest);
        Map<String, Object> claims = oidcUser.getUserInfo().getClaims();
        // We need a mutable Map instead of the returned immutable Map
        Map<String, Object> newClaims = new HashMap<>(claims);

        String sub = (String) newClaims.get("sub");
        Optional<User> optionalUser = userRepository.findBySubIgnoreCase(sub);

        boolean institutionAdmin = InstitutionAdmin.isInstitutionAdmin(claims, entitlement) ||
                (optionalUser.isPresent() && InstitutionAdmin.isInstitutionAdmin(optionalUser.get()));
        newClaims.put(INSTITUTION_ADMIN, institutionAdmin);

        String organizationGuid = institutionAdmin ? InstitutionAdmin.getOrganizationGuid(claims, organizationGuidPrefix, optionalUser)
                .orElse(null) : null;
        newClaims.put(ORGANIZATION_GUID, organizationGuid);

        if (institutionAdmin && StringUtils.hasText(organizationGuid)) {
            String authenticatingAuthority = (String) claims.get("authenticating_authority");
            List<Map<String, Object>> identityProviders = manage.identityProvidersByInstitutionalGUID(Environment.PROD, organizationGuid);
            //If there are multiple identityProviders with the same organizationGuid, we pick the one that was used to login
            Optional<Map<String, Object>> optionalIdentityProvider = identityProviders.isEmpty() ? Optional.empty() :
                    Optional.of(identityProviders.stream()
                            .filter(idp -> entityID(idp).equals(authenticatingAuthority))
                            .findFirst()
                            .orElse(identityProviders.getFirst()));
            optionalIdentityProvider.ifPresent(provider -> newClaims.put(INSTITUTION, new Institution(provider)));
        }
        optionalUser.ifPresent(user -> {
            user.updateAttributes(newClaims);

            LOG.debug("Updating user: " + newClaims);

            userRepository.save(user);
        });
        OidcUserInfo oidcUserInfo = new OidcUserInfo(newClaims);
        oidcUser = new DefaultOidcUser(oidcUser.getAuthorities(), oidcUser.getIdToken(), oidcUserInfo);
        return oidcUser;

    }

    private String entityID(Map<String, Object> provider) {
        Map<String, Object> data = (Map<String, Object>) provider.get("data");
        return (String) data.get("entityid");
    }

}
