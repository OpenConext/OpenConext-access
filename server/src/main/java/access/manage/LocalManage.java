package access.manage;

import access.exception.NotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static java.util.Collections.emptyList;

@SuppressWarnings("unchecked")
public final class LocalManage implements Manage {

    private static final Log LOG = LogFactory.getLog(LocalManage.class);

    private final Map<EntityType, List<Map<String, Object>>> allProviders;
    private final DefaultResourceLoader defaultResourceLoader = new DefaultResourceLoader();

    public LocalManage(ObjectMapper objectMapper) {
        this(objectMapper, "classpath:/manage");
    }

    public LocalManage(ObjectMapper objectMapper, String staticManageDirectory) {
        this.allProviders = Stream.of(EntityType.values()).collect(Collectors.toMap(
                entityType -> entityType,
                entityType -> this.initialize(objectMapper, entityType, staticManageDirectory)));
    }


    @SneakyThrows
    private List<Map<String, Object>> initialize(ObjectMapper objectMapper, EntityType entityType, String staticManageDirectory) {
        String resourceName = String.format("%s/%s.json", staticManageDirectory, entityType.collectionName());
        Resource resource = defaultResourceLoader.getResource(resourceName);
        return objectMapper.readValue(resource.getInputStream(), new TypeReference<>() {
        });
    }

    @Override
    public List<Map<String, Object>> providers(EntityType... entityTypes) {
        LOG.debug("providers for : " + List.of(entityTypes));

        //Ensure it is immutable
        return Stream.of(entityTypes).map(entityType -> this.allProviders.get(entityType).stream().toList())
                .flatMap(List::stream)
                .toList();
    }

    @Override
    public Map<String, Object> providerById(EntityType entityType, String id) {
        LOG.debug("providerById for : " + entityType);

        List<Map<String, Object>> providers = providers(entityType);
        return providers.stream()
                .filter(provider -> provider.get("_id").equals(id))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Provider not found"));
    }

}
