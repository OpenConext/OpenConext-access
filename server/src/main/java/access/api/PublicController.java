package access.api;

import access.config.Config;
import access.manage.Manage;
import access.model.EntityType;
import access.model.Environment;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@RestController
@RequestMapping(value = {"/api/v1/public"}, produces = MediaType.APPLICATION_JSON_VALUE)
@SuppressWarnings("unchecked")
public class PublicController {

    private static final Log LOG = LogFactory.getLog(PublicController.class);

    private final Manage manage;
    private final Config config;

    @SneakyThrows
    public PublicController(Manage manage, Config config) {
        this.manage = manage;
        this.config = config;
    }

    @GetMapping("/service-providers")
    public ResponseEntity<List<Map<String, Object>>> serviceProviders(Authentication authentication) {
        LOG.debug("/serviceProviders");
        List<Map<String, Object>> providers = manage.serviceProvidersLight(Environment.PROD);
        if (authentication == null) {
            providers.removeIf(provider -> removeNonPublicProvider(provider));
        } else {
            DefaultOidcUser user = (DefaultOidcUser) authentication.getPrincipal();
            String schacHomeOrganization = (String) user.getClaims().get("schac_home_organization");
            boolean isExternalUserFromSchacHome = schacHomeOrganization.equals(config.getEduIdSchacHomeOrganization());
            if (isExternalUserFromSchacHome) {
                providers.removeIf(provider -> removeNonPublicProvider(provider));
            } else {
                //We need the identity provider to see which providers are connected and are therefore visiblle
                String authenticatingAuthority = (String) user.getClaims().get("authenticating_authority");
                Map<String, Object> identityProvider = manage.identityProviderByEntityID(authenticatingAuthority);
                Set<String> allowedEntities = ((List<Map<String, String>>) getData(identityProvider)
                        .getOrDefault("allowedEntities", List.of()))
                        .stream()
                        .map(allowedEntity -> allowedEntity.get("name"))
                        .collect(Collectors.toSet());
                providers.removeIf(provider -> removeNonPublicProvider(provider, allowedEntities));
            }
        }
        return ResponseEntity.ok(providers);
    }

    @GetMapping("/identity-providers")
    public ResponseEntity<List<Map<String, Object>>> identityProviders() {
        LOG.debug("/identityProviders");
        return ResponseEntity.ok(manage.identityProvidersLight(Environment.PROD));
    }

    @GetMapping("/service-provider-detail/{type}/{identifier}")
    public ResponseEntity<Map<String, Object>> serviceProviderDetail(
            @PathVariable("type") EntityType entityType,
            @PathVariable("identifier") String identifier) {
        LOG.debug("/identityProviders");
        Map<String, Object> provider = manage
                .providerByManageIdentifier(entityType, identifier, Environment.PROD);
        getMetaDataFields(getData(provider)).keySet()
                .removeIf(key -> key.startsWith("contacts:"));
        return ResponseEntity.ok(provider);
    }

    private boolean removeNonPublicProvider(Map<String, Object> provider) {
        Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
        boolean hidden = (boolean) metaDataFields.getOrDefault("coin:ss:hidden", false);
        boolean idpVisibleOnly = (boolean) metaDataFields.getOrDefault("coin:ss:idp_visible_only", false);
        return hidden || idpVisibleOnly;
    }

    private boolean removeNonPublicProvider(Map<String, Object> provider, Set<String> allowedEntities) {
        Map<String, Object> data = getData(provider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);
        boolean hidden = (boolean) metaDataFields.getOrDefault("coin:ss:hidden", false);
        boolean idpVisibleOnly = (boolean) metaDataFields.getOrDefault("coin:ss:idp_visible_only", false);
        return hidden || (idpVisibleOnly && !allowedEntities.contains((String) data.get("entityid")));
    }
}
