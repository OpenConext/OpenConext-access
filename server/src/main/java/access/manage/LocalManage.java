package access.manage;

import access.exception.NotFoundException;
import access.model.Connection;
import access.model.EntityType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jetbrains.annotations.NotNull;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@SuppressWarnings("unchecked")
public final class LocalManage implements Manage {

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
        String resourceName = String.format("%s/%s.json", staticManageDirectory, entityType.collectionName());
        Resource resource = defaultResourceLoader.getResource(resourceName);
        List<Map<String, Object>> providers = objectMapper.readValue(resource.getInputStream(), new TypeReference<>() {
        });
        return providers.stream().map(provider -> sanitizeProvider(provider)).toList();
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
    public Map<String, Object> providerById(EntityType entityType, String id) {
        LOG.debug("providerById for : " + entityType);

        List<Map<String, Object>> providers = providers(entityType);
        return providers.stream()
                .filter(provider -> provider.get("id").equals(id))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Provider not found"));
    }

    @Override
    public List<Map<String, Object>> providersByIdIn(EntityType entityType, List<String> identifiers) {
        LOG.debug("providersByIdIn for : " + entityType);

        List<Map<String, Object>> providers = this.allProviders.get(entityType);
        return providers.stream()
                .filter(provider -> identifiers.contains(provider.get("id")))
                .collect(Collectors.toList());
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        String providerString = converter.convert(connection);
        Map<String, Object> provider = objectMapper.readValue(providerString, new TypeReference<>() {
        });
        if (provider.containsKey("id")) {
            provider.put("version", (int) provider.get("version") + 1);
        } else {
            provider.put("id", UUID.randomUUID().toString());
            provider.put("version", 1);
        }
        List<Map<String, Object>> providers = this.allProviders.get(connection.getProtocol());
        providers.add(provider);
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


}
