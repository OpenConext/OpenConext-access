package access.api;

import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.jira.JiraClient;
import access.manage.Assurance;
import access.manage.ChangeRequest;
import access.manage.Consent;
import access.manage.Manage;
import access.manage.StepUpType;
import access.manage.MetaData;
import access.manage.MetaDataFeedParser;
import access.manage.PolicyAccessRights;
import access.manage.PolicyDefinition;
import access.model.Authority;
import access.model.Connection;
import access.model.EntityType;
import access.model.Organization;
import access.model.User;
import access.repository.ConnectionRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static access.api.Results.createResult;
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
    private final ConnectionRepository connectionRepository;

    public ManageController(Manage manage,
                            ObjectMapper objectMapper,
                            OrganizationRepository organizationRepository,
                            JiraClient jiraClient, UserRepository userRepository, ConnectionRepository connectionRepository) throws IOException {
        this.manage = manage;
        this.objectMapper = objectMapper;
        this.arpInfo = objectMapper.readValue(new ClassPathResource("/metadata/ARP.json").getInputStream(), new TypeReference<>() {
        });
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
        this.organizationRepository = organizationRepository;
        this.jiraClient = jiraClient;
        this.userRepository = userRepository;
        this.connectionRepository = connectionRepository;
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


    @GetMapping("/identity-providers")
    public ResponseEntity<List<Map<String, Object>>> identityProviders() {
        LOG.debug("/identityProviders");

        List<Map<String, Object>> providers = manage.providers(EntityType.saml20_idp);
        return ResponseEntity.ok(providers);
    }

    @Transactional(readOnly = true)
    @GetMapping("/allowed-service-providers/{organizationId}")
    public ResponseEntity<List<Map<String, Object>>> serviceProviders(User user, @PathVariable Long organizationId) {
        LOG.debug("/serviceProviders for user: " + user.getEmail());

        Organization organization = organizationRepository.getReferenceById(organizationId);

        user = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(user, organization, Authority.ADMIN);

        boolean isIdentityProvider = StringUtils.hasText(organization.getManageIdentifier());
        List<Map<String, Object>> serviceProviders = List.of();
        if (isIdentityProvider) {
            Map<String, Object> identityProvider = manage.providerByManageIdentifier(
                    EntityType.saml20_idp, organization.getManageIdentifier());
            Map<String, Object> data = getData(identityProvider);
            boolean allowedall = (boolean) data.getOrDefault("allowedall", false);
            if (allowedall) {
                serviceProviders = manage.serviceProvidersLight();
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

        Map<String, Object> provider = this.manage.providerByManageIdentifier(EntityType.saml20_idp, organization.getManageIdentifier());

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

    @PutMapping("/update/consent")
    public ResponseEntity<Map<String, Object>> updateMetaDataConsent(User user,
                                                                     @RequestBody Consent consent) {
        LOG.debug("/updateMetaDataConsent for " + consent + " for " + user.getEmail());

        Organization organization = organizationRepository.findByManageIdentifier(consent.identityProviderId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        User userFromDB = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, Authority.ADMIN);

        Map<String, Object> identityProvider = manage.providerByManageIdentifier(EntityType.saml20_idp, consent.identityProviderId());
        Map<String, Object> data = getData(identityProvider);
        //Ensure the application is connected to this IdP
        List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data.get("allowedEntities");
        if (allowedEntities.stream()
                .noneMatch(entity -> consent.name().equals(entity.get("name")))) {
            throw new UserRestrictionException(String.format("%s is not allowed to uppdate consent for %s because this application is not connected to %s",
                    user.getEmail(),
                    consent.name(),
                    consent.identityProviderId()
            ));
        }

        List<Map<String, String>> disableConsent = (List<Map<String, String>>) data.computeIfAbsent("disableConsent", key -> new ArrayList<>());
        Optional<Map<String, String>> optionalCurrentConsent = disableConsent.stream()
                .filter(entry -> consent.name().equals(entry.get("name")))
                .findFirst();
        optionalCurrentConsent.ifPresentOrElse(
                currentConsent -> consent.updateManageMap(currentConsent),
                () -> disableConsent.add(consent.toManageMap()));
        String revisionNote = this.revisionNote("Consent", user, identityProvider, consent.name());
        data.put("revisionnote", revisionNote);
        manage.saveIdentityProvider(identityProvider);

        return createResult();
    }

    @PutMapping("/update/assurance")
    public ResponseEntity<Map<String, Object>> updateMetaDataAssurance(User user,
                                                                       @RequestBody Assurance assurance) {
        LOG.debug("/updateMetaDataAssurance for " + assurance + " for " + user.getEmail());

        Organization organization = organizationRepository.findByManageIdentifier(assurance.identityProviderId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        int loaLevel = user.getLoaLevel();
        User userFromDB = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(userFromDB, organization, Authority.ADMIN);

        if (assurance.stepupEntity().level() != null) {
            StepUpType stepUpType = StepUpType.fromLevel(assurance.stepupEntity().level());
            if (loaLevel < stepUpType.getRequiredLoaLevel()) {
                throw new UserRestrictionException(String.format(
                        "User %s has loaLevel %d but stepUpType %s requires loaLevel %d",
                        user.getEmail(), loaLevel,
                        stepUpType, stepUpType.getRequiredLoaLevel()));
            }
        }

        Map<String, Object> identityProvider = manage.providerByManageIdentifier(EntityType.saml20_idp, assurance.identityProviderId());
        Map<String, Object> data = getData(identityProvider);

        List<Map<String, String>> mfaEntities = (List<Map<String, String>>) data.computeIfAbsent("mfaEntities", key -> new ArrayList<>());
        if (assurance.mfaEntity().level() == null) {
            mfaEntities.removeIf(e -> assurance.mfaEntity().name().equals(e.get("name")));
        } else {
            Optional<Map<String, String>> existingMfa = mfaEntities.stream()
                    .filter(e -> assurance.mfaEntity().name().equals(e.get("name")))
                    .findFirst();
            existingMfa.ifPresentOrElse(
                    e -> e.put("level", assurance.mfaEntity().level()),
                    () -> {
                        Map<String, String> entry = new HashMap<>();
                        entry.put("name", assurance.mfaEntity().name());
                        entry.put("level", assurance.mfaEntity().level());
                        mfaEntities.add(entry);
                    });
        }

        List<Map<String, String>> stepupEntities = (List<Map<String, String>>) data.computeIfAbsent("stepupEntities", key -> new ArrayList<>());
        if (assurance.stepupEntity().level() == null) {
            stepupEntities.removeIf(e -> assurance.stepupEntity().name().equals(e.get("name")));
        } else {
            Optional<Map<String, String>> existingStepup = stepupEntities.stream()
                    .filter(e -> assurance.stepupEntity().name().equals(e.get("name")))
                    .findFirst();
            existingStepup.ifPresentOrElse(
                    e -> e.put("level", assurance.stepupEntity().level()),
                    () -> {
                        Map<String, String> entry = new HashMap<>();
                        entry.put("name", assurance.stepupEntity().name());
                        entry.put("level", assurance.stepupEntity().level());
                        stepupEntities.add(entry);
                    });
        }
        String revisionNote = this.revisionNote("Assurance", user, identityProvider, assurance.stepupEntity().name());
        data.put("revisionnote", revisionNote);
        manage.saveIdentityProvider(identityProvider);
        return createResult();
    }

    @DeleteMapping("/policies/{policyId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Void> deletePolicy(User user,
                                             @RequestParam("organizationId") Long organizationId,
                                             @PathVariable String policyId) {
        Map<String, Object> policy = manage.providerByManageIdentifier(EntityType.policy, policyId);

        Organization organization = organizationRepository.getReferenceById(organizationId);

        LOG.debug("/deletePolicy for " + policy + " for " + user.getEmail());

        policyAccessAllowed(user, policy, organization);
        manage.deletePolicy(policy);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/unique-entity-id")
    public ResponseEntity<List<Map<String, Object>>> providersByEntityId(@RequestBody Map<String, String> data) {
        LOG.debug("/unique-entity-id for " + data);

        String entityID = data.get("entityID");
        //It does not matter which entityType we use, all services will be queried
        List<Map<String, Object>> providers = manage.uniqueEntityId(EntityType.saml20_sp, entityID);
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

        String metaDataId = changeRequest.getMetaDataId();
        Connection connection = connectionRepository.findByProtocolAndManageIdentifier(EntityType.valueOf(changeRequest.getType()), metaDataId)
                .orElseThrow(() -> new NotFoundException("No connection found for " + metaDataId));
        User userFromDB = reinitializeUser(user, userRepository);
        confirmApplicationWriteAccess(userFromDB, connection.getApplication());

        //change request has non guessable identifier
        manage.rejectChangeRequest(changeRequest);

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

    private String revisionNote(String section, User user, Map<String, Object> identityProvider, String applicationEntityId) {
        return String.format("Update in %s settings by %s from %s for %s.",
                section,
                user.getName(),
                getData(identityProvider).get("entityid"),
                applicationEntityId);
    }

}
