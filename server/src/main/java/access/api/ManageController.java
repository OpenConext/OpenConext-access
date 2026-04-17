package access.api;

import access.exception.InvalidInputException;
import access.exception.UserRestrictionException;
import access.jira.JiraClient;
import access.manage.ChangeRequest;
import access.manage.Manage;
import access.manage.MetaData;
import access.manage.MetaDataFeedParser;
import access.manage.PolicyAccessRights;
import access.manage.PolicyDefinition;
import access.model.Authority;
import access.model.EntityType;
import access.model.Environment;
import access.model.Organization;
import access.model.User;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Parameter;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static access.manage.ManageData.getData;

@RestController
@RequestMapping(value = {"/api/v1/manage"}, produces = MediaType.APPLICATION_JSON_VALUE)
@SuppressWarnings("unchecked")
public class ManageController implements UserAccessRights, PolicyAccessRights {

    private static final Log LOG = LogFactory.getLog(ManageController.class);

    private final MetaDataFeedParser metaDataFeedParser = new MetaDataFeedParser();
    private final Manage manage;
    private final ObjectMapper objectMapper;
    private final Map<String, Object> arpInfo;
    private final List<Map<String, Object>> privacyInfo;
    private final OrganizationRepository organizationRepository;
    private final JiraClient jiraClient;
    private final UserRepository userRepository;

    public ManageController(Manage manage,
                            ObjectMapper objectMapper,
                            OrganizationRepository organizationRepository,
                            JiraClient jiraClient, UserRepository userRepository) throws IOException {
        this.manage = manage;
        this.objectMapper = objectMapper;
        this.arpInfo = objectMapper.readValue(new ClassPathResource("/metadata/ARP.json").getInputStream(), new TypeReference<>() {
        });
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
        this.organizationRepository = organizationRepository;
        this.jiraClient = jiraClient;
        this.userRepository = userRepository;
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


    @PostMapping("/parse")
    public ResponseEntity<List<MetaData>> parse(@RequestBody Map<String, String> requestBody) throws URISyntaxException, MalformedURLException {
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


    @GetMapping("/identity-providers/{environment}")
    public ResponseEntity<List<Map<String, Object>>> identityProviders(@PathVariable("environment") Environment environment) {
        LOG.debug("/identityProviders for " + environment);

        List<Map<String, Object>> providers = manage.providers(environment, EntityType.saml20_idp);
        return ResponseEntity.ok(providers);
    }

    @Transactional(readOnly = true)
    @GetMapping("/allowed-service-providers/{organizationId}")
    public ResponseEntity<List<Map<String, Object>>> serviceProviders(User user, @PathVariable Long organizationId) {
        LOG.debug("/serviceProviders for user: " + user.getEmail());

        Organization organization = organizationRepository.getReferenceById(organizationId);

        user = reinitializeUser(user ,userRepository);
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        boolean isIdentityProvider = StringUtils.hasText(organization.getManageIdentifier());
        List<Map<String, Object>> serviceProviders = List.of();
        if (isIdentityProvider) {
            Map<String, Object> identityProvider = manage.providerByManageIdentifier(
                    EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);
            Map<String, Object> data = getData(identityProvider);
            boolean allowedall = (boolean) data.getOrDefault("allowedall", false);
            if (allowedall) {
                serviceProviders = manage.serviceProvidersLight(Environment.PROD);
            } else {
                List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data.get("allowedEntities");
                List<String> names = allowedEntities.stream().map(allowedEntity -> allowedEntity.get("name")).toList();
                serviceProviders = manage.serviceProvidersByEntityID(names);
            }
        }
        return ResponseEntity.ok(serviceProviders);
    }

    @GetMapping("/identity-provider/policies")
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<Map<String, Object>>> identityProviderPolicies(@Parameter(hidden = true) User user,
                                                                              @RequestParam("organizationId") Long organizationId) {
        LOG.debug("/identityProviderPolicies for " + user.getEmail());

        Organization organization = organizationRepository.getReferenceById(organizationId);

        confirmInstitutionAdmin(user, organization);

        Map<String, Object> provider = this.manage.providerByManageIdentifier(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);

        List<Map<String, Object>> policies = this.manage.policiesByIdentityProvider((String) getData(provider).get("entityid"));
        return ResponseEntity.ok(policies);
    }


    @GetMapping("/policies")
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<Map<String, Object>>> policies(@Parameter(hidden = true) User user,
                                                              @RequestParam("entityId") String entityId,
                                                              @RequestParam("organizationId") Long organizationId) {
        LOG.debug("/policies for " + entityId + " for " + user.getEmail());
        Organization organization = organizationRepository.getReferenceById(organizationId);
        confirmInstitutionAdmin(user, organization);
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


    @PostMapping("/policies")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> createPolicy(User user,
                                                            @RequestParam("organizationId") Long organizationId,
                                                            @RequestBody Map<String, Object> policy) {
        LOG.debug("/createPolicy for " + policy + " for " + user.getEmail());

        Organization organization = organizationRepository.getReferenceById(organizationId);

        policyAccessAllowed(user, policy, organization);
        return ResponseEntity.ok(manage.createPolicy(policy));
    }


    @PutMapping("/policies")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> updatePolicy(User user,
                                                            @RequestParam("organizationId") Long organizationId,
                                                            @RequestBody Map<String, Object> policy) {
        LOG.debug("/updatePolicy for " + policy + " for " + user.getEmail());

        Organization organization = organizationRepository.getReferenceById(organizationId);

        policyAccessAllowed(user, policy, organization);
        return ResponseEntity.ok(manage.updatePolicy(policy));
    }


    @DeleteMapping("/policies/{policyId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Void> deletePolicy(User user,
                                             @RequestParam("organizationId") Long organizationId,
                                             @PathVariable String policyId) {
        Map<String, Object> policy = manage.providerByManageIdentifier(EntityType.policy, policyId, Environment.PROD);

        Organization organization = organizationRepository.getReferenceById(organizationId);

        LOG.debug("/deletePolicy for " + policy + " for " + user.getEmail());

        policyAccessAllowed(user, policy, organization);
        manage.deletePolicy(policy);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/unique-entity-id/{environment}")
    public ResponseEntity<List<Map<String, Object>>> providersByEntityId(@PathVariable("environment") Environment environment,
                                                                         @RequestBody Map<String, String> data) {
        LOG.debug("/unique-entity-id for " + data);

        String entityID = data.get("entityID");
        //It does not matter which entityType we use, all services will be queried
        List<Map<String, Object>> providers = manage.uniqueEntityId(environment, EntityType.saml20_sp, entityID);
        return ResponseEntity.ok(providers);
    }


    @PostMapping("/unique-policy-name")
    public ResponseEntity<List<Map<String, Object>>> uniquePolicyName(@RequestBody Map<String, Object> properties) {
        LOG.debug("/unique-entity-id for " + properties);

        List<Map<String, Object>> policies = manage.uniquePolicyName(properties);
        return ResponseEntity.ok(policies);
    }

    @GetMapping("/autocomplete/{type}")
    public List<Map<String, Object>> autoCompleteEntities(@PathVariable EntityType type,
                                                          @RequestParam("query") String query) {
        Map<String, List<Map<String, Object>>> entities = manage.autoCompleteEntities(type, query);
        //We concat the suggestions and alternatives
        List<Map<String, Object>> suggestions = entities.getOrDefault("suggestions", new ArrayList<>());
        List<Map<String, Object>> alternatives = entities.getOrDefault("alternatives", new ArrayList<>());
        suggestions.addAll(alternatives);
        return suggestions;
    }


    @GetMapping("/allowed-attributes")
    public ResponseEntity<List<Map<String, Object>>> allowedAttributes() {
        LOG.debug("/allowedAttributes");

        return ResponseEntity.ok(manage.allowedAttributes());
    }


    @PutMapping("/reject-change-request")
    public ResponseEntity<Map<String, Object>> rejectChangeRequest(User user, @RequestBody ChangeRequest changeRequest) {
        LOG.debug("/reject-change-request " + changeRequest + " by " + user.getEmail());

        //change request has non guessable identifier
        manage.rejectChangeRequest(Environment.PROD, changeRequest);

        jiraClient.comment(changeRequest.getTicketKey(), "Ticket can be closed by request of the requestor");

        return Results.okResult();
    }

    private void policyAccessAllowed(User user, Map<String, Object> policy, Organization organization) {
        confirmInstitutionAdmin(user, organization);
        //We don't want to use PolicyDefinition as @RequestBody, because the template from Manage is leading
        PolicyDefinition policyDefinition = this.objectMapper.convertValue(policy.get("data"), PolicyDefinition.class);
        confirmPolicyAccess(user, policyDefinition, manage, organization);
    }

    private Map<String, Object> getIdentityProvider(User user) {
        //We can't use any cache as this method is called right after automatic connection allowed
        Map<String, Object> identityProvider = manage.identityProviderByEntityID(user.getAuthenticatingAuthority());
        return getData(identityProvider);
    }


}
