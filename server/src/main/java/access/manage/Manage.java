package access.manage;

import access.model.Connection;
import access.model.EntityType;

import java.util.List;
import java.util.Map;

public interface Manage {

    List<Map<String, Object>> providers(EntityType... entityTypes);

    Map<String, Object> providerById(EntityType entityType, String id);

    List<Map<String, Object>> providersByIdIn(EntityType entityType, List<String> identifiers);

    Map<String, Object> saveProvider(Connection connection);

    void deleteProvider(Connection connection);

    default Map<String, Object> sanitizeProvider(Map<String, Object> provider) {
        //Different Manage API calls return 'id' or '_id'
        if (provider.containsKey("id")) {
            provider.put("_id", provider.get("id"));
        } else {
            provider.put("id", provider.get("_id"));
        }
        return provider;
    }
}