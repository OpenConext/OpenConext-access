package access.api;

import access.config.Config;
import access.exception.InvalidInputException;
import access.exception.NotFoundException;
import access.jira.JiraClient;
import access.jira.JiraIssue;
import access.manage.ChangeRequest;
import access.manage.ConnectionProviderConverter;
import access.manage.ListMerger;
import access.manage.Manage;
import access.manage.PathUpdateType;
import access.manage.RequestType;
import access.model.Application;
import access.model.Authority;
import access.model.Connection;
import access.model.ConnectionStatus;
import access.model.EntityType;
import access.model.Organization;
import access.model.State;
import access.model.User;
import access.repository.ApplicationRepository;
import access.repository.ConnectionRepository;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.passay.data.EnglishCharacterData;
import org.passay.generate.PasswordGenerator;
import org.passay.rule.CharacterRule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;
import static access.api.Results.deleteResult;
import static access.manage.ManageData.*;

@RestController
@RequestMapping(value = {"/api/v1/connections"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class ConnectionController implements UserAccessRights {

    public static final int SECRET_LENGTH = 36;

    private static final Log LOG = LogFactory.getLog(ConnectionController.class);

    private final ConnectionRepository connectionRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final Manage manage;
    private final JiraClient jiraClient;
    private final List<CharacterRule> passwordGeneratorRules = initPasswordGeneratorRules();
    private final PasswordGenerator passwordGenerator = new PasswordGenerator(SECRET_LENGTH, passwordGeneratorRules);
    private final ConnectionProviderConverter connectionProviderConverter;
    private final ObjectMapper objectMapper;
    private final Config config;
    private final OrganizationRepository organizationRepository;
    private final List<String> eduidIdpEntityIdentifiers;

    public ConnectionController(ConnectionRepository connectionRepository,
                                ApplicationRepository applicationRepository,
                                UserRepository userRepository,
                                Manage manage,
                                JiraClient jiraClient,
                                ConnectionProviderConverter connectionProviderConverter,
                                ObjectMapper objectMapper,
                                Config config, OrganizationRepository organizationRepository,
                                @Value("${eduid-idp-entity-id}") String eduidIdpEntityId) {
        this.connectionRepository = connectionRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.manage = manage;
        this.jiraClient = jiraClient;
        this.connectionProviderConverter = connectionProviderConverter;
        this.objectMapper = objectMapper;
        this.config = config;
        this.organizationRepository = organizationRepository;
        this.eduidIdpEntityIdentifiers = Stream.of(eduidIdpEntityId.split(",")).map(String::trim).toList();
    }

    private List<CharacterRule> initPasswordGeneratorRules() {
        return List.of(
            new CharacterRule(EnglishCharacterData.LowerCase, 8),
            new CharacterRule(EnglishCharacterData.UpperCase, 8),
            new CharacterRule(EnglishCharacterData.Digit, 8));
    }

    @GetMapping({"/{connectionId}"})
    public ResponseEntity<Connection> find(User user, @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/find connection for " + user.getEmail());

        Connection connection = connectionRepository.findById(connectionId)
            .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();

        user = reinitializeUser(user, userRepository);
        //Connection detail includes the live OAuth/OIDC client secret - require at least org-level MEMBER,
        //not the lowest (GUEST) tier, before it can be viewed
        confirmApplicationWriteAccess(user, application, Authority.MEMBER);

        if (StringUtils.hasText(connection.getManageIdentifier())) {
            Map<String, Object> provider = manage.providerByConnection(connection);
            if (connection.mergeMetaData(provider, false)) {
                connectionRepository.save(connection);
            }
            if (connection.getStatus().equals(ConnectionStatus.PROD_READY)) {
                connection.convertChangeRequests(manage.getChangeRequests(connection));
            }
        }
        return ResponseEntity.ok(connection);
    }

    @GetMapping({"/{manageType}/{manageIdentifier}"})
    public ResponseEntity<?> findByManage(User user,
                                          @PathVariable("manageType") EntityType entityType,
                                          @PathVariable String manageIdentifier) {
        LOG.debug("/find findByManage for " + user.getEmail());

        return connectionRepository.findByProtocolAndManageIdentifier(entityType, manageIdentifier)
            .map(connection -> {
                Application application = connection.getApplication();

                User userFromDB = reinitializeUser(user, userRepository);
                //Connection detail includes the live OAuth/OIDC client secret - require at least org-level MEMBER,
                //not the lowest (GUEST) tier, before it can be viewed
                confirmApplicationWriteAccess(userFromDB, application, Authority.MEMBER);

                Organization organization = application.getOrganization();
                return ResponseEntity.ok(Map.of(
                    "connection", connection,
                    "application", application,
                    "organisation", organization
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Connection> create(User user, @Validated @RequestBody Connection connection) {
        LOG.debug("/create connection by " + user.getEmail());
        if (!connection.isValid()) {
            throw new InvalidInputException("Connection is not valid");
        }

        Long applicationID = connection.getApplication().getId();
        Application application = applicationRepository.findById(applicationID)
            .orElseThrow(() -> new NotFoundException("Application not found"));

        user = this.reinitializeUser(user, userRepository);
        //GUEST is the lowest, view-only tier (see AUDIT.md #7) - creating a connection (which can carry a
        //client secret) is a write operation and must require at least MEMBER
        confirmApplicationWriteAccess(user, application, Authority.MEMBER);

        //Never trust a client-supplied id on a create - would otherwise let save() merge() into (i.e. overwrite)
        //an arbitrary existing connection row instead of inserting a new one
        connection.setId(null);
        connection.setCreatedAt(Instant.now());
        connection.setApplication(application);
        connection = saveConnection(connection);

        return ResponseEntity.status(HttpStatus.CREATED).body(connection);
    }

    @PutMapping({"", "/"})
    public ResponseEntity<Connection> update(User user, @Validated @RequestBody Connection connectionData) {
        LOG.debug("/update connection by " + user.getEmail());
        Connection connection = doUpdateConnection(user, connectionData);
        return ResponseEntity.status(HttpStatus.CREATED).body(connection);
    }

    @PutMapping("/update-request-production-status")
    public ResponseEntity<Map<String, Object>> updateWithProductionReadyRequest(User user, @Validated @RequestBody Connection connectionData) {
        LOG.debug("/update connection by " + user.getEmail());
        Connection connection = this.doUpdateConnection(user, connectionData);
        if (connection.getStatus().equals(ConnectionStatus.PENDING_PROD) ||
            connection.getStatus().equals(ConnectionStatus.PROD_READY)) {
            //not allowed to ask for production status twice
            throw new InvalidInputException(String.format("User %s is requesting production status with status already %s",
                user.getEmail(), connection.getStatus()));
        }
        String jiraKey = this.doRequestProductionStatus(user, connection);
        Map<String, Object> body = Map.of("connection", connection, "jiraKey", jiraKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private Connection doUpdateConnection(User user, Connection connectionData) {
        if (!connectionData.isValid()) {
            throw new InvalidInputException("Connection is not valid");
        }
        Connection connection = findConnectionForAuthorizedUser(user, connectionData.getId());
        boolean isResourceServer = connection.getProtocol().equals(EntityType.oauth20_rs);
        List<String> previousAllowedResourceServers = isResourceServer ?
            allowedResourceServerNames(connection) : Collections.emptyList();
        connection.merge(connectionData);

        if (connection.isEduIdAccessEnabled() != connectionData.isEduIdAccessEnabled()) {
            Map<String, Object> provider = manage.providerByConnection(connection);
            String entityId = (String) ((Map) provider.get("data")).get("entityid");
            this.addOrRemoveEduIDIdp(user, connection, entityId);
        }

        if (connection.changeRequestRequired() && !config.isTestEnvironment()) {
            //Not allowed to sync the connection to Manage. Create or update outstanding ChangeRequest
            connection = this.productionReadyChangeRequests(connection, user);
            connection.convertChangeRequests(manage.getChangeRequests(connection));
        } else {
            connection = saveConnection(connection);
        }

        if (isResourceServer) {
            this.syncAllowedResourceServers(connection, previousAllowedResourceServers);
        }
        return connection;
    }

    //The 'afnemers' (customers) of a resource server are the relying parties allowed to request tokens for it.
    //Manage stores this the other way around - on each relying party's own 'allowedResourceServers' - so any
    //addition or removal made here must be pushed to the affected relying parties individually.
    //The local metaData cache on the resource server's own Connection can be stale (e.g. a previous sync failed,
    //or a relying party was changed directly in Manage), so the current state is queried from Manage instead
    private List<String> allowedResourceServerNames(Connection connection) {
        String resourceServerEntityId = (String) connection.getMetaData().get("entityID");
        if (!StringUtils.hasText(resourceServerEntityId)) {
            return List.of();
        }
        List<Map<String, Object>> relyingParties = manage.relyingPartiesByAllowedResourceServer(resourceServerEntityId);
        return relyingParties.stream().map(relyingParty -> getEntityID(relyingParty)).toList();
    }

    //The desired new set of allowed relying parties, as just submitted by the user - unlike allowedResourceServerNames
    //this must be read from metaData, since nothing has been synced to Manage for this submission yet
    @SuppressWarnings("unchecked")
    private List<String> submittedAllowedResourceServerNames(Connection connection) {
        List<Map<String, String>> allowedResourceServers = (List<Map<String, String>>) connection.getMetaData()
            .getOrDefault("allowedResourceServers", new ArrayList<>());
        return allowedResourceServers.stream().map(resourceServer -> resourceServer.get("name")).toList();
    }

    @SuppressWarnings("unchecked")
    private void syncAllowedResourceServers(Connection connection, List<String> previousNames) {
        String resourceServerEntityId = (String) connection.getMetaData().get("entityID");
        if (!StringUtils.hasText(resourceServerEntityId)) {
            return;
        }
        List<String> currentNames = submittedAllowedResourceServerNames(connection);
        List<String> added = currentNames.stream().filter(name -> !previousNames.contains(name)).toList();
        List<String> removed = previousNames.stream().filter(name -> !currentNames.contains(name)).toList();
        if (added.isEmpty() && removed.isEmpty()) {
            return;
        }
        List<String> affectedNames = Stream.concat(added.stream(), removed.stream()).distinct().toList();
        List<Map<String, Object>> relyingParties = manage.relyingPartiesByEntityID(affectedNames);
        relyingParties.forEach(relyingParty -> {
            Map<String, Object> data = getData(relyingParty);
            List<Map<String, String>> allowedResourceServers = ((List<Map<String, String>>) data
                .getOrDefault("allowedResourceServers", new ArrayList<>()))
                .stream()
                .filter(resourceServer -> !resourceServer.get("name").equals(resourceServerEntityId))
                .collect(Collectors.toCollection(ArrayList::new));
            if (added.contains(getEntityID(relyingParty))) {
                allowedResourceServers.add(Map.of("name", resourceServerEntityId));
            }
            data.put("allowedResourceServers", allowedResourceServers);
            manage.updateProvider(relyingParty);
        });
    }

    @SneakyThrows
    @GetMapping(value = "/change-requests/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> changeRequests(User user, @PathVariable("connectionId") Long connectionId) {
        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        List<Map<String, Object>> changeRequests = manage.getChangeRequests(connection);
        return ResponseEntity.ok(changeRequests);
    }

    @SneakyThrows
    @GetMapping(value = "/relying-parties/{organizationId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Connection>> relyingPartiesByOrganization(User user, @PathVariable("organizationId") Long organizationId) {
        Organization organization = organizationRepository.getReferenceById(organizationId);
        user = reinitializeUser(user, userRepository);
        confirmOrganizationMembership(user, organization, Authority.MEMBER);

        List<Connection> connections = connectionRepository.findByProtocolAndApplicationOrganizationId(EntityType.oidc10_rp, organizationId);
        connections.
            stream()
            .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
            .forEach(connection -> {
                Map<String, Object> provider = manage.providerByConnection(connection);
                if (connection.mergeMetaData(provider, false)) {
                    connectionRepository.save(connection);
                }
        });

        return ResponseEntity.ok(connections);
    }

    @PutMapping(value = "/reset-secret/{connectionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> secret(User user, @PathVariable("connectionId") Long connectionId) {
        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        String secret = passwordGenerator.generate().toString();
        connection.getMetaData().put("secret", secret);
        connection.setSecretSet(false);
        saveConnection(connection);

        return Collections.singletonMap("secret", secret);
    }

    private String doRequestProductionStatus(User user, Connection connection) {
        Map<String, Object> provider = manage.providerByConnection(connection);
        String entityId = getEntityID(provider);
        config.getIdentityProviders().forEach(idp -> {
            Map<String, Object> idpData = manage.identityProviderByEntityID(idp.get("entityid"));
            Map<String, Object> data = getData(idpData);
            List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data
                .getOrDefault("allowedEntities", new ArrayList<>());
            List<Map<String, String>> newAllowedEntities = allowedEntities.stream()
                .filter(allowedEntity -> !allowedEntity.get("name").equals(entityId))
                .toList();
            data.put("allowedEntities", newAllowedEntities);
            manage.saveIdentityProvider(idpData);
        });

        if (config.isTestEnvironment()) {
            Map<String, Object> data = getData(provider);
            data.put("state", State.prodaccepted.name());
            connection.setStatus(ConnectionStatus.PROD_READY);
            saveConnection(connection);
            manage.updateProvider(provider);
            return "No ticket created";
        }
        String changeRequestURL = manage.changeRequestURL(connection);

        String lineSeparator = System.lineSeparator();
        String summary = String.format("Production status requested by %s for %s.",
            user.getName(), connection.getName());
        JiraIssue jiraIssue = new JiraIssue(
            entityId,
            null,// There is no identity provider for requesting production status
            String.format("%s A change request in manage has been created to merge this user request. See:%s%s",
                summary,
                lineSeparator,
                changeRequestURL),
            summary,
            connection.getProtocol(),
            user.getEmail(),
            connection.getManageIdentifier()
        );
        String jiraKey = jiraClient.create(jiraIssue);
        Map<String, Object> auditData = Map.of("user", user.getEmail(),
            "notes", String.format("Production status requested by %s for %s. See Jira %s",
                user.getName(), connection.getName(), jiraKey));
        ChangeRequest changeRequest = new ChangeRequest(
            connection.getManageIdentifier(),
            connection.getProtocol(),
            Map.of("state", State.prodaccepted.name()),
            false,
            PathUpdateType.ADDITION,
            RequestType.ProductionStatusRequest);
        changeRequest.setTicketKey(jiraKey);
        changeRequest.setAuditData(auditData);
        Map<String, Object> changeRequestResponse = manage.createChangeRequest(changeRequest);

        LOG.debug("Change request response from manage: " + changeRequestResponse);

        connection.setStatus(ConnectionStatus.PENDING_PROD);
        saveConnection(connection);
        return jiraKey;
    }

    private void addOrRemoveEduIDIdp(User user, Connection connection, String entityId) {
        //Only superusers and organization admins are allowed to do this
        if (user.isSuperUser() || getOrganizationMembership(user, connection.getApplication().getOrganization(), Authority.ADMIN).isPresent()) {
            eduidIdpEntityIdentifiers.forEach(eduidIdpEntityId -> {
                Map<String, Object> eduidIdpProvider = manage.identityProviderByEntityID(eduidIdpEntityId);
                Map<String, Object> data = getData(eduidIdpProvider);
                List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data
                    .getOrDefault("allowedEntities", new ArrayList<>());
                List<Map<String, String>> newAllowedEntities = new ArrayList<>(allowedEntities.stream()
                    .filter(allowedEntity -> !allowedEntity.get("name").equals(entityId))
                    .toList());
                if (connection.isEduIdAccessEnabled()) {
                    newAllowedEntities.add(Map.of("name", entityId));
                }
                data.put("allowedEntities", newAllowedEntities);
                manage.saveIdentityProvider(eduidIdpProvider);
            });
        }
    }

    @DeleteMapping({"", "/{connectionId}"})
    public ResponseEntity<Map<String, Object>> delete(User user, @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/delete connection by " + user.getEmail());

        Connection connection = findConnectionForAuthorizedUser(user, connectionId);

        //To prevent org.hibernate.TransientObjectException: persistent instance references an unsaved transient
        Application application = connection.getApplication();
        application.removeConnection(connection);

        if (StringUtils.hasText(connection.getManageIdentifier())) {
            manage.deleteProvider(connection);
        }

        connectionRepository.deleteConnectionById(connectionId);

        return deleteResult();
    }

    @GetMapping("/identity-providers-allowed-connections/{connectionId}")
    public ResponseEntity<List<Map<String, Object>>> identityProvidersByAllowedConnections(User user,
                                                                                           @PathVariable("connectionId") Long connectionId) {
        LOG.debug("/identityProvidersByAllowedConnections by: " + user.getEmail());
        Connection connection = connectionRepository.findById(connectionId)
            .orElseThrow(() -> new NotFoundException("Connection not found"));

        user = reinitializeUser(user, userRepository);
        confirmApplicationWriteAccess(user, connection.getApplication(), Authority.GUEST);

        List<Map<String, Object>> identityProviders = manage.identityProvidersByAllowedConnections(List.of(connection));
        return ResponseEntity.ok(identityProviders);
    }

    private boolean isNewChangeRequestDuplicate(List<Map<String, Object>> existingChangeRequests,
                                                Optional<ChangeRequest> newChangeRequest) {
        if (isEmpty(existingChangeRequests)) {
            return false;
        }
        return newChangeRequest
            .map(changeRequest ->
                existingChangeRequests.stream().anyMatch(changeRequestMap -> changeRequest.matches(changeRequestMap)))
            .orElse(false);

    }

    @SuppressWarnings("unchecked")
    private Connection productionReadyChangeRequests(Connection connection, User user) {
        String changeRequestURL = manage.changeRequestURL(connection);
        Map<String, Object> provider = manage.providerByConnection(connection);
        connection.updateRemoteManageData(provider);
        List<Map<String, Object>> existingChangeRequests = manage.getChangeRequests(connection);
        Optional<ChangeRequest> changeRequestOptional = connectionProviderConverter.deduceChangeRequests(connection, provider);
        boolean isDuplicate = isNewChangeRequestDuplicate(existingChangeRequests, changeRequestOptional);
        if (changeRequestOptional.isPresent() && !isDuplicate) {
            if (existingChangeRequests.isEmpty()) {
                //No existing change requests, proceed as normal and create a ticket
                String entityId = (String) ((Map) provider.get("data")).get("entityid");
                String summary = String.format("Data change requested by %s for %s with entityID %s",
                    user.getName(),
                    connection.getName(),
                    entityId);
                String jiraKey = jiraClient.create(new JiraIssue(
                    entityId,
                    null,// There is no identity provider for change requests
                    String.format("%s A change request in manage has been created to merge this user request. See:%s%s",
                        summary,
                        System.lineSeparator(),
                        changeRequestURL),
                    summary,
                    connection.getProtocol(),
                    user.getEmail(),
                    null
                ));
                Map<String, Object> auditData = Map.of("user", user.getEmail(),
                    "notes", String.format("Data change requested by %s for %s. See Jira %s",
                        user.getName(),
                        connection.getName(),
                        jiraKey));
                ChangeRequest changeRequest = changeRequestOptional.get();
                changeRequest.setTicketKey(jiraKey);
                changeRequest.setAuditData(auditData);
                manage.createChangeRequest(changeRequest);
            } else {
                //Now we need to ensure that previous change requests, with the same pathUpdate and value a List, does not overwrite changes
                //And therefore we don't create a new change request, but update the existing one
                Map<String, Object> existingChangeRequest = existingChangeRequests.getFirst();
                ChangeRequest newChangeRequest = changeRequestOptional.get();
                Map<String, Object> existingPathUpdates = (Map<String, Object>) existingChangeRequest.get("pathUpdates");
                Map<String, Object> newPathUpdates = newChangeRequest.getPathUpdates();
                newPathUpdates.forEach((key, value) -> {
                    if (key.equals("arp") && existingPathUpdates.containsKey(key)) {
                        //three way merge on the attributes and profile, motivation from the latest change
                        Map<String, Object> attributes = (Map<String, Object>) ((Map<String, Object>) value).getOrDefault("attributes", Map.of());
                        List<String> attibuteNames = attributes.keySet().stream().toList();

                        Map<String, Object> arpPath = (Map<String, Object>) existingPathUpdates.getOrDefault("arp", Map.of());
                        Map<String, Object> pathAttributes = (Map<String, Object>) arpPath.getOrDefault("attributes", Map.of());
                        List<String> pathValues = pathAttributes.keySet().stream().toList();

                        Map<String, Object> baseArp = (Map<String, Object>) getData(provider).getOrDefault("arp", Map.of());
                        Map<String, Object> baseAttributes = (Map<String, Object>) baseArp.getOrDefault("attributes", Map.of());
                        List<String> baseValues = baseAttributes.keySet().stream().toList();

                        List<String> newValues = ListMerger.threeWayMerge(baseValues, pathValues, attibuteNames);
                        //Now we need to construct a new attributes Map with all the values from the three attributes Map
                        Map<String, Object> newAttributes = newValues.stream().collect(Collectors.toMap(
                            attrName -> attrName,
                            attrName -> attributes.getOrDefault(attrName, pathAttributes.getOrDefault(attrName, baseAttributes.get(attrName)))));
                        arpPath.put("attributes", newAttributes);
                    } else if (value instanceof List && existingPathUpdates.containsKey(key)) {
                        //three way merge
                        List<String> pathUpdateValue = (List<String>) existingPathUpdates.get(key);
                        List<String> base = (List<String>) getMetaDataFields(getData(provider)).getOrDefault(key.substring(key.indexOf(".") + 1), List.of());
                        List<String> newValues = ListMerger.threeWayMerge(base, pathUpdateValue, (List<String>) value);
                        existingPathUpdates.put(key, newValues);
                    } else {
                        //simply override
                        existingPathUpdates.put(key, value);
                    }
                });
                ChangeRequest changeRequest = objectMapper.convertValue(existingChangeRequest, ChangeRequest.class);
                manage.updateChangeRequest(changeRequest);
            }
        }

        //Now the tricky bit, we must fetch the changeRequest after they are created and return the data based on the provider
        connection.mergeMetaData(provider, true);
        connection = connectionRepository.save(connection);
        connection.convertChangeRequests(manage.getChangeRequests(connection));
        return connection;
    }

    @SuppressWarnings("unchecked")
    private Connection saveConnection(Connection connection) {
        //Put / Post to Manage only if the status is not OPEN
        boolean isResourceServer = connection.getProtocol().equals(EntityType.oauth20_rs);
        if (!connection.getStatus().equals(ConnectionStatus.OPEN)) {
            boolean isPrivateRelyingParty = connection.getProtocol().equals(EntityType.oidc10_rp) &&
                connection.getMetaData().getOrDefault("pkce", false) == Boolean.FALSE;
            boolean secretNotSet = !connection.isSecretSet();
            if ((isPrivateRelyingParty || isResourceServer) && secretNotSet) {
                //generate secret if it is not already set, but store the raw-text variant, because Manage encodes it
                String secret = (String) connection.getMetaData().getOrDefault("secret", passwordGenerator.generate().toString());
                connection.getMetaData().put("secret", secret);
                connection.setSecretSet(true);
            }
            Map<String, Object> provider = manage.saveProvider(connection);
            connection.updateRemoteManageData(provider);

            if ((isPrivateRelyingParty || isResourceServer) && secretNotSet) {
                //We must store the encrypted secret, otherwise manage will keep encrypting it again and again
                Map<String, Object> data = getData(provider);
                Map<String, Object> metaDataFields = getMetaDataFields(data);
                String secretFromManage = (String) metaDataFields.get("secret");
                if (StringUtils.hasText(secretFromManage) && secretFromManage.length() != SECRET_LENGTH) {
                    String originalSecret = (String) connection.getMetaData().get("secret");
                    connection.getMetaData().put("secret", secretFromManage);
                    //To display in the client
                    if (originalSecret.length() == SECRET_LENGTH) {
                        connection.getMetaData().put("originalSecret", originalSecret);
                    }
                }
            }

            List<Map<String, Object>> contactPersons = (List<Map<String, Object>>) connection.getMetaData().get("contactPersons");
            if (!CollectionUtils.isEmpty(contactPersons)) {
                Application application = connection.getApplication();
                application.getMetaData().put("contactPersons", contactPersons);
                applicationRepository.save(application);
                //No need to store redundant data
                connection.getMetaData().remove("contactPersons");
            }
        }
        //Now sync the Connection to Manage, but first check if we need to connect to test IdP's
        if (connection.getState().equals(State.testaccepted) && connection.getStatus().equals(ConnectionStatus.COMPLETE) &&
            !connection.isTestIdpInitialized() && !isResourceServer) {
            String entityID = (String) connection.getMetaData().get("entityID");
            config.getIdentityProviders().forEach(idp -> {
                Map<String, Object> provider = manage.identityProviderByEntityID(idp.get("entityid"));
                Map<String, Object> data = getData(provider);
                List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data
                    .getOrDefault("allowedEntities", new ArrayList<>());
                allowedEntities.add(Map.of("name", entityID));
                data.put("allowedEntities", allowedEntities);
                manage.saveIdentityProvider(provider);
            });
            connection.setTestIdpInitialized(true);
        }
        return connectionRepository.save(connection);
    }

    //Used by update/updateWithProductionReadyRequest, secret (reset-secret), delete and changeRequests - all
    //mutate or expose the connection's secret, so GUEST (the lowest, view-only tier - see AUDIT.md #7) must not
    //be allowed through here
    private Connection findConnectionForAuthorizedUser(User user, Long connectionId) {
        Connection connection = connectionRepository.findById(connectionId)
            .orElseThrow(() -> new NotFoundException("Connection not found"));
        Application application = connection.getApplication();
        user = this.reinitializeUser(user, userRepository);
        confirmApplicationWriteAccess(user, application, Authority.MEMBER);
        return connection;
    }


}
