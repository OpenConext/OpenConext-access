package access.manage;

import access.exception.NotFoundException;
import access.model.Connection;
import access.model.EntityType;
import access.model.Organization;
import access.model.User;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.util.StringUtils;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@SuppressWarnings("unchecked")
public final class LocalManage implements Manage {

    private static final Log LOG = LogFactory.getLog(LocalManage.class);

    private final Map<EntityType, List<Map<String, Object>>> allProviders;
    private final DefaultResourceLoader defaultResourceLoader = new DefaultResourceLoader();
    private final ConnectionProviderConverter converter;
    private final ObjectMapper objectMapper;
    private final Map<String, Map<String, Object>> policies = new HashMap<>();

    public LocalManage(ConnectionProviderConverter converter, ObjectMapper objectMapper, String staticManageDirectory) {
        this.converter = converter;
        this.objectMapper = objectMapper;
        this.allProviders = Stream.of(EntityType.values()).collect(Collectors.toMap(
                entityType -> entityType,
                entityType -> this.initialize(entityType, staticManageDirectory)));
    }

    @SneakyThrows
    private List<Map<String, Object>> initialize(EntityType entityType, String staticManageDirectory) {
        String resourceName = String.format("%s/%s.json", staticManageDirectory, entityType.name());
        Resource resource = defaultResourceLoader.getResource(resourceName);
        List<Map<String, Object>> providers = objectMapper.readValue(resource.getInputStream(), new TypeReference<>() {
        });
        //Need mutability
        return providers.stream().map(provider -> sanitizeProvider(provider))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    @Override
    public List<Map<String, Object>> providers(EntityType... entityTypes) {
        LOG.debug("providers for : " + List.of(entityTypes));

        //Ensure it is mutable
        return Stream.of(entityTypes).map(entityType -> this.allProviders.get(entityType).stream().toList())
                .flatMap(List::stream)
                .toList();
    }

    @Override
    public Map<String, Object> providerByConnection(Connection connection) {
        String manageIdentifier = connection.getManageIdentifier();
        EntityType protocol = connection.getProtocol();

        LOG.debug("providerById for : " + protocol);

        List<Map<String, Object>> providers = providers(protocol);
        return providers.stream()
                .filter(provider -> provider.get("id").equals(manageIdentifier))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Provider not found"));
    }

    @Override
    public Map<String, Object> providerByManageIdentifier(EntityType entityType, String manageIdentifier) {
        LOG.debug("providerById for : " + entityType);

        List<Map<String, Object>> providers = providers(entityType);
        return providers.stream()
                .filter(provider -> provider.get("id").equals(manageIdentifier))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Provider not found"));
    }

    @Override
    public Map<String, Object> saveIdentityProvider(Organization organization) {
        Map<String, Object> provider = providerByManageIdentifier(EntityType.saml20_idp, organization.getManageIdentifier());
        Map<String, Object> data = getData(provider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);
        converter.convertContactPersons(organization.getMetaData(), metaDataFields);
        return provider;
    }

    @Override
    public Map<String, Object>  saveIdentityProvider(Map<String, Object> identityProvider) {
        return identityProvider;
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        Map<String, Object> provider = StringUtils.hasText(connection.getManageIdentifier()) ?
                providerByConnection(connection) :
                baseStructureProvider(connection.getProtocol());

        boolean existingProvider = provider.containsKey("id");
        if (existingProvider) {
            provider.put("version", (int) provider.get("version") + 1);
        } else {
            provider.put("id", UUID.randomUUID().toString());
            provider.put("version", 0);
        }
        List<Map<String, Object>> providers = this.allProviders.get(connection.getProtocol());
        if (existingProvider) {
            int index = IntStream.range(0, providers.size())
                    .filter(i -> providers.get(i).get("id") == provider.get("id"))
                    .findFirst()
                    .orElse(-1);
            if (index != -1) {
                providers.set(index, provider);
            }
        } else {
            providers.add(provider);
        }
        return provider;
    }

    @Override
    public Map<String, Object> updateProvider(Map<String, Object> provider) {
        return provider;
    }

    @Override
    public void deleteProvider(Connection connection) {
        List<Map<String, Object>> newProviders = this.allProviders.get(connection.getProtocol())
                .stream()
                .filter(provider -> !provider.get("id").equals(connection.getManageIdentifier()))
                .toList();
        this.allProviders.put(connection.getProtocol(), newProviders);
    }

    @Override
    public Map<String, Object> identityProviderByEntityID(String entityID) {
        return this.allProviders.get(EntityType.saml20_idp).stream()
                .filter(provider -> {
                    Map<String, Object> data = (Map<String, Object>) provider.get("data");
                    return entityID.equalsIgnoreCase((String) data.get("entityid"));
                })
                .findFirst()
                .orElseThrow(() -> new NotFoundException("No identityProviders found for entityID: " + entityID));
    }

    @Override
    public List<Map<String, Object>> serviceProvidersByEntityID(List<String> entityIdentifiers) {
        return Stream.of(EntityType.saml20_sp, EntityType.oidc10_rp)
                .flatMap(type -> this.allProviders.get(type).stream())
                .filter(provider -> entityIdentifiers.contains((String) ((Map) provider.get("data")).get("entityid")))
                .toList();
    }

    @Override
    public List<Map<String, Object>> uniqueEntityId(EntityType entityType, String entityID) {
        return allProviders.get(entityType).stream()
                .filter(provider -> getData(provider).get("entityid").equals(entityID))
                .toList();
    }

    @Override
    public Map<String, Object> createChangeRequest(ChangeRequest changeRequest) {
        return Map.of();
    }

    @Override
    public Map<String, Object> updateChangeRequest(ChangeRequest changeRequest) {
        return Map.of();
    }

    @Override
    public void rejectChangeRequest(ChangeRequest changeRequest) {
        //noop
    }

    @Override
    public List<Map<String, Object>> getChangeRequests(Connection connection) {
        return List.of();
    }

    @Override
    public List<Map<String, Object>> getChangeRequestsIdentityProvider(Map<String, Object> identityProvider) {
        return List.of();
    }

    @Override
    public String changeRequestURL(Connection connection) {
        return String.format("http://localhost:8088/metadata/%s/%s", connection.getProtocol().name(), connection.getManageIdentifier());
    }

    @Override
    public String changeRequestURLConnectionRequest(EntityType entityType, String manageIdentifier) {
        return String.format("http://localhost:8088/metadata/%s/%s", entityType.name(), manageIdentifier);
    }

    @Override
    public List<Map<String, Object>> identityProvidersByInstitutionalGUID(String organisationGUID) {
        return this.allProviders.get(EntityType.saml20_idp).stream()
                .filter(provider -> {
                    Map<String, Object> data = getData(provider);
                    Map<String, Object> metaDataFields = getMetaDataFields(data);
                    return organisationGUID.equalsIgnoreCase((String) metaDataFields.get(INSTITUTION_GUID));
                })
                .toList();
    }

    @Override
    public List<Map<String, Object>> identityProvidersLight() {
        return this.allProviders.get(EntityType.saml20_idp);
    }

    @Override
    public List<Map<String, Object>> serviceProvidersLight() {
        List<Map<String, Object>> providers = new ArrayList<>();
        providers.addAll(this.allProviders.get(EntityType.saml20_sp));
        providers.addAll(this.allProviders.get(EntityType.oidc10_rp));
        return providers;
    }

    @Override
    public Map<String, Integer> stats() {
        return Arrays.stream(EntityType.values())
                .collect(Collectors.toMap(
                        entityType -> entityType.name(),
                        entityType -> this.allProviders.get(entityType).size()));

    }

    @Override
    public List<Map<String, Object>> identityProvidersByAllowedConnections(List<Connection> connections) {
        List<String> entityIdentifiers = connections.stream()
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()))
                .map(connection -> {
                    Map<String, Object> provider = this.providerByConnection(connection);
                    Map<String, Object> data = (Map<String, Object>) provider.get("data");
                    return (String) data.get("entityid");
                })
                .toList();
        return this.allProviders.get(EntityType.saml20_idp).stream()
                .filter(idp -> {
                    Map<String, Object> data = (Map<String, Object>) idp.get("data");
                    List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data.getOrDefault("allowedEntities", List.of());
                    return allowedEntities.stream()
                            .map(m -> m.get("name"))
                            .anyMatch(entityIdentifiers::contains);
                })
                .toList();
    }

    @Override
    public List<Map<String, Object>> policiesByServiceProvider(String identityProviderEntityId, String serviceProviderEntityId) {
        return this.allProviders.get(EntityType.policy).stream()
                .filter(policy -> {
                    Map<String, Object> data = getData(policy);
                    List<Map<String, String>> serviceProviderIds = (List<Map<String, String>>)
                            data.getOrDefault("serviceProviderIds", List.of());
                    List<Map<String, String>> identityProviderIds = (List<Map<String, String>>)
                            data.getOrDefault("identityProviderIds", List.of());
                    return serviceProviderIds.stream()
                            .anyMatch(m -> m.get("name").equals(serviceProviderEntityId))
                            && (identityProviderIds.isEmpty() ||
                            identityProviderIds.stream()
                                    .anyMatch(m -> m.get("name").equals(identityProviderEntityId)));
                })
                .toList();
    }

    @Override
    public List<Map<String, Object>> policiesByServiceProviders(List<String> serviceProviderEntityIds) {
        if (serviceProviderEntityIds.isEmpty()) {
            return List.of();
        }
        return this.allProviders.get(EntityType.policy).stream()
                .filter(policy -> {
                    List<Map<String, String>> serviceProviderIds = (List<Map<String, String>>)
                            getData(policy).getOrDefault("serviceProviderIds", List.of());
                    return serviceProviderIds.stream()
                            .anyMatch(m -> serviceProviderEntityIds.contains(m.get("name")));
                })
                .toList();
    }

    @Override
    public List<Map<String, Object>> policiesByIdentityProvider(String identityProviderEntityId) {
        return this.allProviders.get(EntityType.policy).stream()
                .filter(policy -> {
                    Map<String, Object> data = getData(policy);
                    List<Map<String, String>> identityProviderIds = (List<Map<String, String>>)
                            data.getOrDefault("identityProviderIds", List.of());
                    return identityProviderIds.stream()
                            .anyMatch(m -> m.get("name").equals(identityProviderEntityId));
                })
                .toList();
    }


    @Override
    public Map<String, Object> createPolicy(Map<String, Object> policy) {
        String id = UUID.randomUUID().toString();
        policy.put("id", id);
        policies.put(id, policy);
        return policy;
    }

    @Override
    public Map<String, Object> updatePolicy(Map<String, Object> policy) {
        policies.put((String) policy.get("id"), policy);
        return policy;
    }

    @Override
    public List<Map<String, Object>> uniquePolicyName(Map<String, Object> properties) {
        String name = (String) properties.get("name");
        return policies.values().stream().filter(policy -> ((String) policy.get("name")).equalsIgnoreCase(name))
                .toList();
    }

    @SneakyThrows
    @Override
    public List<Map<String, Object>> allowedAttributes() {
        return objectMapper.readValue(new ClassPathResource("/manage/allowed_attributes.json").getInputStream(), new TypeReference<>() {
        });
    }

    @Override
    public void deletePolicy(Map<String, Object> policy) {
        policies.remove((String) policy.get("id"));
    }

    @Override
    public void connectWithoutInteraction(Map<String, Object> identityProvider, Map<String, Object> serviceProvider, User currentUser) {
        //nope
    }

    @Override
    public void disconnectWithoutInteraction(Map<String, Object> identityProvider, Map<String, Object> serviceProvider, User currentUser) {
        //nope
    }

    @SneakyThrows
    @Override
    public List<Map<String, Object>> allScopes() {
        return objectMapper.readValue(new ClassPathResource("/manage/scopes.json").getInputStream(), new TypeReference<>() {
        });
    }

    @Override
    public Map<String, List<Map<String, Object>>> autoCompleteEntities(EntityType type, String query) {
        String lowerCaseQuery = query.toLowerCase();
        return Map.of("suggestions", this.allProviders.get(type).stream()
                .filter(entity -> {
                    Map<String, Object> data = getData(entity);
                    String entityid = (String) data.get("entityid");
                    if (entityid.toLowerCase().contains(lowerCaseQuery)) {
                        return true;
                    }
                    Map<String, Object> metaDataFields = getMetaDataFields(data);
                    return Stream.of("name:en", "name:nl", "OrganizationName:en", "OrganizationName:nl")
                            .anyMatch(attr -> {
                                String val = (String) metaDataFields.get("attr");
                                return StringUtils.hasText(val) && val.toLowerCase().contains(query);
                            });
                })
                .toList());
    }
}
