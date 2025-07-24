package access.manage;

import access.model.Connection;
import access.model.EntityType;
import access.model.Environment;

import java.util.*;

public interface Manage {

    List<Map<String, Object>> providers(Environment environment, EntityType... entityTypes);

    Map<String, Object> providerById(Connection connection);

    Map<String, Object> saveProvider(Connection connection);

    void deleteProvider(Connection connection);

    List<Map<String, Object>> providersByEntityID(Environment environment, EntityType entityType, String entityID);

    Map<String, Object> createChangeRequest(Environment environment, ChangeRequest changeRequest);

    String changeRequestURL(Environment environment, Connection connection);

    Optional<Map<String, Object>> identityProviderByInstitutionalGUID(Environment environment, String organisationGUID);

    default Map<String, Object> sanitizeProvider(Map<String, Object> provider) {
        //Different Manage API calls return 'id' or '_id'
        if (provider.containsKey("id")) {
            provider.put("_id", provider.get("id"));
        } else {
            provider.put("id", provider.get("_id"));
        }
        return provider;
    }

    default Map<String, Object> baseStructureProvider() {
        //Base structure must be mutable
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> data = new HashMap<>();
        Map<String, Object> metaDataFields = new HashMap<>();
        data.put("metaDataFields", metaDataFields);
        data.put("allowedEntities", new ArrayList<>());

        Map<String, Object> arp = new HashMap<>();
        arp.put("attributes", new HashMap<>());
        data.put("arp", arp);
        data.put("allowedEntities", new ArrayList<>());

        result.put("data", data);
        return result;
    }

}