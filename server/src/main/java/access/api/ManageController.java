package access.api;

import access.exception.InvalidInputException;
import access.exception.UserRestrictionException;
import access.manage.*;
import access.model.EntityType;
import access.model.Environment;
import access.model.Institution;
import access.model.User;
import access.security.InstitutionAdmin;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;

import static access.manage.ManageData.getData;

@RestController
@RequestMapping(value = {"/api/v1/manage"}, produces = MediaType.APPLICATION_JSON_VALUE)
public class ManageController implements UserAccessRights, PolicyAccessRights {

    private static final Log LOG = LogFactory.getLog(ManageController.class);

    private final MetaDataFeedParser metaDataFeedParser = new MetaDataFeedParser();
    private final Manage manage;
    private final ObjectMapper objectMapper;
    private final Map<String, Object> arpInfo;
    private final List<Map<String, Object>> privacyInfo;

    @SneakyThrows
    public ManageController(Manage manage,
                            ObjectMapper objectMapper) {
        this.manage = manage;
        this.objectMapper = objectMapper;
        this.arpInfo = objectMapper.readValue(new ClassPathResource("/metadata/ARP.json").getInputStream(), new TypeReference<>() {
        });
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
    }

    @GetMapping("/arp")
    public ResponseEntity<Map<String, Object>> arp() {
        LOG.debug("/arp");
        return ResponseEntity.ok(this.arpInfo);
    }

    @GetMapping("/privacy")
    public ResponseEntity<List<Map<String, Object>>> privacy() {
        LOG.debug("/privacy");
        return ResponseEntity.ok(this.privacyInfo);
    }

    @SneakyThrows
    @PostMapping("/parse")
    public ResponseEntity<List<MetaData>> parse(@RequestBody Map<String, String> requestBody) {
        List<EntityDescriptor> entityDescriptors;
        Resource resource;
        if (requestBody.containsKey("url")) {
            URL url = new URI(requestBody.get("url")).toURL();
            String protocol = url.getProtocol().toLowerCase();
            if (!List.of("http", "https").contains(protocol)) {
                throw new InvalidInputException("Not allowed protocol: " + protocol);
            }
            resource = new UrlResource(url);
        } else {
            String xml = requestBody.get("xml");
            resource = new ByteArrayResource(xml.getBytes(Charset.defaultCharset()));
        }
        entityDescriptors = metaDataFeedParser.importXML(resource);
        return ResponseEntity.ok(entityDescriptors.stream().map(MetaData::new).toList());
    }

    @SneakyThrows
    @GetMapping("/identity-providers/{environment}")
    public ResponseEntity<List<Map<String, Object>>> identityProviders(@PathVariable("environment") Environment environment) {
        List<Map<String, Object>> providers = manage.providers(environment, EntityType.saml20_idp);
        return ResponseEntity.ok(providers);
    }

    @SneakyThrows
    @GetMapping("/policies")
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<Map<String, Object>>> policies(User user,
                                                              Authentication authentication,
                                                              @RequestParam("entityId") String entityId) {
        confirmInstitutionAdmin(user);
        //we need to ensure the application is connected to the IdP of the user - realtime
        if (!user.isSuperUser()) {
            Map<String, Object> data = getIdentityProvider(authentication);
            boolean noneMatch = ((List<Map<String, String>>) data.getOrDefault("allowedEntities", List.of()))
                    .stream()
                    .noneMatch(allowedEntity -> allowedEntity.get("name").equals(entityId));

            if (noneMatch) {
                throw new UserRestrictionException(String.format("User %s is not allowed to request policies for %s",
                        user.getEmail(), entityId));
            }
        }
        List<Map<String, Object>> policies = this.manage
                .policiesByServiceProvider(user.getAuthenticatingAuthority(), entityId);
        return ResponseEntity.ok(policies);
    }

    @SneakyThrows
    @PostMapping("/policies")
    public ResponseEntity<Map<String, Object>> createPolicy(User user,
                                                            @RequestBody Map<String, Object> policy) {
        confirmInstitutionAdmin(user);
        //We don't want to use PolicyDefinition as @RequestBody, because the template from Manage is leading
        PolicyDefinition policyDefinition = this.objectMapper.convertValue(policy, PolicyDefinition.class);
        confirmPolicyAccess(user, policyDefinition, manage);
        return ResponseEntity.ok(policy);
    }

    @SneakyThrows
    @PostMapping("/unique-entity-id/{environment}")
    public ResponseEntity<List<Map<String, Object>>> providersByEntityId(@PathVariable("environment") Environment environment,
                                                                         @RequestBody Map<String, String> data) {
        String entityID = data.get("entityID");
        //It does not matter which entityType we use, all services will be queried
        List<Map<String, Object>> providers = manage.uniqueEntityId(environment, EntityType.saml20_sp, entityID);
        return ResponseEntity.ok(providers);
    }

    @SneakyThrows
    @PutMapping("/reject-change-request")
    public ResponseEntity<Map<String, Object>> rejectChangeRequest(@RequestBody ChangeRequest changeRequest) {
        manage.rejectChangeRequest(Environment.PROD, changeRequest);
        return Results.okResult();
    }

    private Map<String, Object> getIdentityProvider(Authentication authentication) {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        Map<String, Object> claims = oidcUser.getUserInfo().getClaims();
        Institution institution = (Institution) claims.get(InstitutionAdmin.INSTITUTION);
        //We can't use any cache as this method is called right after automatic connection allowed
        Map<String, Object> identityProvider = manage.providerById(EntityType.saml20_idp, institution.getManageIdentifier(), Environment.PROD);
        Map<String, Object> data = getData(identityProvider);
        return data;
    }


}
