package access.manage;

import access.exception.NotFoundException;
import access.model.Connection;
import access.model.EntityType;
import access.model.Environment;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@SuppressWarnings("unchecked")
public final class  LocalManage implements Manage {

    private static final Log LOG = LogFactory.getLog(LocalManage.class);

    private final Map<EntityType, List<Map<String, Object>>> allProviders;
    private final DefaultResourceLoader defaultResourceLoader = new DefaultResourceLoader();
    private final ConnectionProviderConverter converter;
    private final ObjectMapper objectMapper;

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
    public List<Map<String, Object>> providers(Environment environment, EntityType... entityTypes) {
        LOG.debug("providers for : " + List.of(entityTypes));

        //Ensure it is mutable
        return Stream.of(entityTypes).map(entityType -> this.allProviders.get(entityType).stream().toList())
                .flatMap(List::stream)
                .toList();
    }

    @Override
    public Map<String, Object> providerById(Connection connection) {
        String manageIdentifier = connection.getManageIdentifier();
        EntityType protocol = connection.getProtocol();
        Environment environment = connection.getEnvironment();

        LOG.debug("providerById for : " + protocol);

        List<Map<String, Object>> providers = providers(environment, protocol);
        return providers.stream()
                .filter(provider -> provider.get("id").equals(manageIdentifier))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Provider not found"));
    }

    @Override
    public Map<String, Object> providerById(EntityType entityType, String manageIdentifier, Environment environment) {
        LOG.debug("providerById for : " + entityType);

        List<Map<String, Object>> providers = providers(environment, entityType);
        return providers.stream()
                .filter(provider -> provider.get("id").equals(manageIdentifier))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Provider not found"));
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        Map<String, Object> baseStructure = StringUtils.hasText(connection.getManageIdentifier()) ?
                providerById(connection) :
                baseStructureProvider();

        Map<String, Object> provider = converter.convert(connection, baseStructure, false);
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
    public void deleteProvider(Connection connection) {
        List<Map<String, Object>> newProviders = this.allProviders.get(connection.getProtocol())
                .stream()
                .filter(provider -> !provider.get("id").equals(connection.getManageIdentifier()))
                .toList();
        this.allProviders.put(connection.getProtocol(), newProviders);
    }

    @Override
    public List<Map<String, Object>> providersByEntityID(Environment environment, EntityType entityType, String entityID) {
        return Stream.of(EntityType.values())
                .flatMap(type -> this.allProviders.get(type).stream())
                .filter(provider -> ((Map) provider.get("data")).get("entityid").equals(entityID))
                .toList();

    }

    @Override
    public Map<String, Object> createChangeRequest(Environment environment, ChangeRequest changeRequest) {
        return Map.of();
    }

    @Override
    public void rejectChangeRequest(Environment environment, ChangeRequest changeRequest) {
        //noop
    }

    @Override
    public List<Map<String, Object>> getChangeRequests(Environment environment, Connection connection) {
        return List.of();
    }

    @Override
    public String changeRequestURL(Environment environment, Connection connection) {
        return String.format("http://localhost:8088/metadata/%s/%s", connection.getProtocol().name(), connection.getManageIdentifier());
    }

    @Override
    public Optional<Map<String, Object>> identityProviderByInstitutionalGUID(Environment environment, String organisationGUID) {
        return this.allProviders.get(EntityType.saml20_idp).stream()
                .filter(provider -> {
                    Map<String, Object> data = (Map<String, Object>) provider.get("data");
                    Map<String, Object> metaDataFields = (Map<String, Object>) data.get("metaDataFields");
                    return organisationGUID.equalsIgnoreCase((String) metaDataFields.get("coin:institution_guid"));
                })
                .findFirst();
    }

    @Override
    public List<Map<String, Object>> identityProvidersLight(Environment environment) {
        return this.allProviders.get(EntityType.saml20_idp);
    }

    @Override
    public List<Map<String, Object>> serviceProvidersLight(Environment environment) {
        List<Map<String, Object>> providers = new ArrayList<>();
        providers.addAll( this.allProviders.get(EntityType.saml20_sp));
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
}
