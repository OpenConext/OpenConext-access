package access.api;

import access.config.Config;
import access.manage.Manage;
import access.model.EntityType;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static access.api.Results.forbiddenResult;
import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;
import static access.manage.ManageData.removeSecretsFromProvider;

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
    public ResponseEntity<List<Map<String, Object>>> serviceProviders(Authentication authentication,
                                                                      @RequestParam(value = "manageIdentifier",
                                                                          required = false) String manageIdentifier) {
        LOG.debug("/serviceProviders");
        List<Map<String, Object>> providers = manage.serviceProvidersLight();
        Set<String> allowedEntities = allowedEntities(authentication, manageIdentifier);
        providers.removeIf(provider -> removeNonPublicProvider(provider, allowedEntities));
        //RemoteManage's search query already restricts fields, but LocalManage.serviceProvidersLight() (used
        //whenever manage.enabled=false, the shipped application.yml default) returns full, unfiltered records -
        //never rely solely on the upstream query shape for an unauthenticated endpoint
        List<Map<String, Object>> sanitizedProviders = providers.stream()
                .map(provider -> removeSecretsFromProvider(provider))
                .toList();
        return ResponseEntity.ok(sanitizedProviders);
    }

    @GetMapping("/identity-providers")
    public ResponseEntity<List<Map<String, Object>>> identityProviders() {
        LOG.debug("/identityProviders");
        return ResponseEntity.ok(manage.identityProvidersLight());
    }

    @GetMapping("/service-provider-detail/{type}/{identifier}")
    public ResponseEntity<Map<String, Object>> serviceProviderDetail(
        Authentication authentication,
        @PathVariable("type") EntityType entityType,
        @PathVariable("identifier") String identifier) {

        LOG.debug("/service-provider-detail");
        if (!List.of(EntityType.oidc10_rp, EntityType.saml20_sp).contains(entityType)) {
            return forbiddenResult();
        }

        Map<String, Object> provider = manage
            .providerByManageIdentifier(entityType, identifier);
        Set<String> allowedEntities = allowedEntities(authentication, null);
        if (removeNonPublicProvider(provider, allowedEntities)) {
            return forbiddenResult();
        }
        //Defensive copy first - the returned provider may be a cached / shared instance (e.g. LocalManage)
        provider = removeSecretsFromProvider(provider);
        getMetaDataFields(getData(provider)).keySet()
            .removeIf(key -> key.startsWith("contacts:"));

        return ResponseEntity.ok(provider);
    }

    private Set<String> allowedEntities(Authentication authentication, String manageIdentifier) {
        if (authentication == null) {
            return Set.of();
        }
        DefaultOidcUser user = (DefaultOidcUser) authentication.getPrincipal();
        String schacHomeOrganization = (String) user.getClaims().get("schac_home_organization");
        if (config.getExternalSchacHomeOrganizations().contains(schacHomeOrganization)) {
            return Set.of();
        }
        //We need the identity provider to see which providers are connected and are therefore visible
        Map<String, Object> identityProvider;
        if (StringUtils.hasText(manageIdentifier)) {
            identityProvider = manage.providerByManageIdentifier(EntityType.saml20_idp, manageIdentifier);
        } else {
            String surfCrmId = (String) user.getClaims().get("surf-crm-id");
            List<Map<String, Object>> identityProviders = manage.identityProvidersByInstitutionalGUID(surfCrmId);
            String authenticatingAuthority = (String) user.getClaims().get("authenticating_authority");
            identityProvider = identityProviders.stream()
                .filter(idp -> authenticatingAuthority.equals(getData(idp).get("entityid")))
                .findFirst()
                .orElseGet(identityProviders::getFirst);
        }
        return ((List<Map<String, String>>) getData(identityProvider)
            .getOrDefault("allowedEntities", List.of()))
            .stream()
            .map(allowedEntity -> allowedEntity.get("name"))
            .collect(Collectors.toSet());
    }

    private boolean removeNonPublicProvider(Map<String, Object> provider, Set<String> allowedEntities) {
        Map<String, Object> data = getData(provider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);
        boolean hidden = (boolean) metaDataFields.getOrDefault("coin:ss:hidden", false);
        boolean idpVisibleOnly = (boolean) metaDataFields.getOrDefault("coin:ss:idp_visible_only", false);
        return hidden || (idpVisibleOnly && !allowedEntities.contains((String) data.get("entityid")));
    }
}
