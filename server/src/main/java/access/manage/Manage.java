package access.manage;

import access.model.*;

import java.util.*;

public interface Manage {

    List<Map<String, Object>> providers(Environment environment, EntityType... entityTypes);

    Map<String, Object> providerById(Connection connection);

    Map<String, Object> providerById(EntityType entityType, String manageIdentifier, Environment environment);

    Map<String, Object> saveIdentityProvider(Organization organization);

    Map<String, Object> saveProvider(Connection connection);

    void deleteProvider(Connection connection);

    Map<String, Object> identityProviderByEntityID(String entityID);

    List<Map<String, Object>> serviceProvidersByEntityID(List<String> entityIdentifiers);

    List<Map<String, Object>> uniqueEntityId(Environment environment, EntityType entityType, String entityID);

    Map<String, Object> createChangeRequest(Environment environment, ChangeRequest changeRequest);

    void rejectChangeRequest(Environment environment, ChangeRequest changeRequest);

    List<Map<String, Object>> getChangeRequests(Environment environment, Connection connection);

    List<Map<String, Object>> getChangeRequestsIdentityProvider(Map<String, Object> identityProvider);

    String changeRequestURL(Environment environment, Connection connection);

    String changeRequestURLConnectionRequest(EntityType entityType, String manageIdentifier);

    List<Map<String, Object>> identityProvidersByInstitutionalGUID(Environment environment, String organisationGUID);

    Map<String, Integer> stats();

    List<Map<String, Object>> identityProvidersLight(Environment environment);

    List<Map<String, Object>> serviceProvidersLight(Environment environment);

    List<Map<String, Object>> identityProvidersByAllowedConnections(List<Connection> connections);

    List<Map<String, Object>> policiesByServiceProvider(String identityProviderEntityId,
                                                        String serviceProviderEntityId);

    void connectWithoutInteraction(Map<String, Object> identityProvider, Map<String, Object> serviceProvider, User currentUser);

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
        //Base structure must be mutable, so using Map.of(...) is a no-go
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> data = new HashMap<>();
        Map<String, Object> metaDataFields = new HashMap<>();
        data.put("metaDataFields", metaDataFields);
        data.put("allowedEntities", new ArrayList<>());

        Map<String, Object> arp = new HashMap<>();
        arp.put("attributes", new HashMap<>());
        arp.put("enabled", true);
        data.put("arp", arp);
        data.put("allowedEntities", new ArrayList<>());

        result.put("data", data);
        return result;
    }

}