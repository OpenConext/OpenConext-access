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

    Map<String, Object> updateProvider(Connection connection);

}