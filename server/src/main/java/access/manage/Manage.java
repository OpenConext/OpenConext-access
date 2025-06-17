package access.manage;

import access.model.Connection;
import access.model.EntityType;
import access.model.Environment;

import java.util.List;
import java.util.Map;

public interface Manage {

    List<Map<String, Object>> providers(Environment environment, EntityType... entityTypes);

    Map<String, Object> providerById(Environment environment, EntityType entityType, String id);

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