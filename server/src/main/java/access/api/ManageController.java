package access.api;

import access.exception.InvalidInputException;
import access.exception.UserRestrictionException;
import access.manage.*;
import access.model.EntityType;
import access.model.Environment;
import access.model.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Parameter;
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
        LOG.debug("/parse");

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
        LOG.debug("/identityProviders for " + environment);

        List<Map<String, Object>> providers = manage.providers(environment, EntityType.saml20_idp);
        return ResponseEntity.ok(providers);
    }

    @SneakyThrows
    @GetMapping("/policies")
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<Map<String, Object>>> policies(@Parameter(hidden = true) User user,
                                                              @RequestParam("entityId") String entityId) {
        LOG.debug("/policies for " + entityId + " for " + user.getEmail());

        confirmInstitutionAdmin(user);
        //we need to ensure the application is connected to the IdP of the user - realtime
        if (!user.isSuperUser()) {
            Map<String, Object> data = getIdentityProvider(user);
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
    public ResponseEntity<Map<String, Object>> createPolicy(User user, @RequestBody Map<String, Object> policy) {
        LOG.debug("/createPolicy for " + policy + " for " + user.getEmail());

        policyAccessAllowed(user, policy, true);
        return ResponseEntity.ok(manage.createPolicy(policy));
    }

    @SneakyThrows
    @PutMapping("/policies")
    public ResponseEntity<Map<String, Object>> updatePolicy(User user, @RequestBody Map<String, Object> policy) {
        LOG.debug("/updatePolicy for " + policy + " for " + user.getEmail());

        policyAccessAllowed(user, policy, true);
        return ResponseEntity.ok(manage.updatePolicy(policy));
    }

    @SneakyThrows
    @DeleteMapping("/policies/{policyId}")
    public ResponseEntity<Void> deletePolicy(User user, @PathVariable String policyId) {
        Map<String, Object> policy = manage.providerById(EntityType.policy, policyId, Environment.PROD);

        LOG.debug("/deletePolicy for " + policy + " for " + user.getEmail());

        policyAccessAllowed(user, policy, true);
        manage.deletePolicy(policy);
        return ResponseEntity.noContent().build();
    }

    @SneakyThrows
    @PostMapping("/unique-entity-id/{environment}")
    public ResponseEntity<List<Map<String, Object>>> providersByEntityId(@PathVariable("environment") Environment environment,
                                                                         @RequestBody Map<String, String> data) {
        LOG.debug("/unique-entity-id for " + data);

        String entityID = data.get("entityID");
        //It does not matter which entityType we use, all services will be queried
        List<Map<String, Object>> providers = manage.uniqueEntityId(environment, EntityType.saml20_sp, entityID);
        return ResponseEntity.ok(providers);
    }

    @SneakyThrows
    @PostMapping("/unique-policy-name")
    public ResponseEntity<List<Map<String, Object>>> uniquePolicyName(@RequestBody Map<String, Object> properties) {
        LOG.debug("/unique-entity-id for " + properties);

        List<Map<String, Object>> policies = manage.uniquePolicyName(properties);
        return ResponseEntity.ok(policies);
    }


    @GetMapping("/allowed-attributes")
    public ResponseEntity<List<Map<String, Object>>> allowedAttributes() {
        LOG.debug("/allowedAttributes");

        return ResponseEntity.ok(manage.allowedAttributes());
    }

    @SneakyThrows
    @PutMapping("/reject-change-request")
    public ResponseEntity<Map<String, Object>> rejectChangeRequest(User user, @RequestBody ChangeRequest changeRequest) {
        LOG.debug("/reject-change-request " + changeRequest + " by " + user.getEmail());
        //change request has non guessable identifier
        manage.rejectChangeRequest(Environment.PROD, changeRequest);
        return Results.okResult();
    }

    private void policyAccessAllowed(User user, Map<String, Object> policy, boolean throwException) {
        confirmInstitutionAdmin(user);
        //We don't want to use PolicyDefinition as @RequestBody, because the template from Manage is leading
        PolicyDefinition policyDefinition = this.objectMapper.convertValue(policy.get("data"), PolicyDefinition.class);
        confirmPolicyAccess(user, policyDefinition, manage);
    }

    private Map<String, Object> getIdentityProvider(User user) {
        //We can't use any cache as this method is called right after automatic connection allowed
        Map<String, Object> identityProvider = manage.identityProviderByEntityID(user.getAuthenticatingAuthority());
        return getData(identityProvider);
    }


}
