package access.manage;

import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@SuppressWarnings("unchecked")
public class ConnectionProviderConverter {

    private final List<Map<String, Object>> privacyInfo;
    private final List<String> excludedARPAttributes;
    private final List<String> excludedAttributes = List.of("revisionNote");
    private final List<String> excludedMergeAttributesPaths = List.of("arp.attributes");

    private final State defaultTestState;
    private final State defaultProdState;
    private final ObjectMapper objectMapper;

    @SneakyThrows
    public ConnectionProviderConverter(ObjectMapper objectMapper, State defaultTestState, State defaultProdState) {
        this.defaultTestState = defaultTestState;
        this.defaultProdState = defaultProdState;
        this.objectMapper = objectMapper;
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
        Map<String, List<Map<String, Object>>> arpInfo = objectMapper.readValue(new ClassPathResource("/metadata/ARP.json").getInputStream(), new TypeReference<>() {
        });
        Set<String> profileAttributes = arpInfo.get("profiles").stream()
                .map(m -> {
                    List<String> attributes = (List) m.get("attributes");
                    List<String> optionalAttributes = (List) m.get("optionalAttributes");
                    attributes.addAll(optionalAttributes);
                    return attributes;
                })
                .flatMap(List::stream)
                .collect(Collectors.toSet());
        excludedARPAttributes = arpInfo.get("attributes").stream()
                .filter(m -> !profileAttributes.contains((String) m.get("name")))
                .map(m -> (String) m.get("urn"))
                .toList();
    }

    public Map<String, Object> convert(Connection connection, Map<String, Object> remoteProvider, boolean changeRequestRequired) {
        Application application = connection.getApplication();
        //We need data both from the connection and the application
        Map<String, Object> connectionMetaData = connection.getMetaData();
        Map<String, Object> applicationMetaData = application.getMetaData();
        Map<String, Object> information = (Map<String, Object>) applicationMetaData.getOrDefault("information", Map.of());

        //Base structure
        Map<String, Object> data = getData(remoteProvider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);

        //Now copy all information from the connection to the data / metadata
        putIf(remoteProvider, "id", connection.getManageIdentifier());
        putIf(remoteProvider, "version", connection.getManageVersion());
        remoteProvider.put("type", connection.getProtocol().name());
        putIf(remoteProvider, "eid", connection.getManageEid());

        data.put("entityid", connectionMetaData.get("entityID"));
        //Don't override the state, if previously set
        if (!StringUtils.hasText((String) data.get("state"))) {
            data.put("state", (connection.getEnvironment().equals(Environment.TEST) ? defaultTestState : defaultProdState).name());
        }

        metaDataFields.put("name:en", connection.getName());
        metaDataFields.put("name:nl", connection.getName());

        putIf(metaDataFields, "logo:0:url", application.getLogoUrl());
        putIf(metaDataFields, "coin:application_name", application.getName());

        putIf(metaDataFields, "description:en", information.get("descriptionEN"));
        putIf(metaDataFields, "description:nl", information.get("descriptionNL"));
        putIf(metaDataFields, "coin:application_url", information.get("webSite"));
        List<String> tags = (List<String>) information.getOrDefault("tags", List.of());
        putIf(metaDataFields, "application_tags", tags);

        List<Map<String, String>> contactPersons = (List<Map<String, String>>) applicationMetaData.getOrDefault("contactPersons", Collections.emptyList());
        IntStream.range(0, contactPersons.size()).forEach(i -> {
            Map<String, String> contactPerson = contactPersons.get(i);
            Map.of("type", "contactType", "email", "emailAddress", "givenName", "givenName", "surName", "surName")
                    .forEach((k, v) -> putIf(metaDataFields, "contacts:" + i + ":" + v, contactPerson.get(k)));
        });
        Map<String, String> privacy = (Map<String, String>) applicationMetaData.getOrDefault("privacy", Map.of());
        privacyInfo.forEach(item -> putIf(metaDataFields, (String) item.get("manage"), privacy.get(item.get("name"))));

        metaDataFields.put("OrganizationName:en", application.getOrganization().getName());

        data.put("allowedall", false);
        data.put("revisionnote", "SURF Access update with remote API");

        //We have merged everything from the application now, stop if changeRequestRequired
        if (changeRequestRequired) {
            return remoteProvider;
        }
        mergeAttributeReleasePolicies(connectionMetaData, data);

        if (connection.getEnvironment().equals(Environment.TEST)) {
            mergeAllowedEntities(data, connectionMetaData);
        }


        if (EntityType.oidc10_rp.equals(connection.getProtocol())) {
            List<String> grantTypes = (List<String>) connectionMetaData.get("grantTypes");
            putIf(metaDataFields, "grants", grantTypes);
            putIf(metaDataFields, "redirectUrls", connectionMetaData.get("redirectUrls"));
            metaDataFields.put("isPublicClient", connectionMetaData.getOrDefault("pkce", false));
            metaDataFields.put("oidc:claims_in_id_token", connectionMetaData.getOrDefault("claimsInIdToken", false));
            metaDataFields.put("accessTokenValidity", 3600);
            if (grantTypes.contains("refresh_token")) {
                metaDataFields.put("refreshTokenValidity", connectionMetaData.getOrDefault("refreshTokenValidity", 3600));
            }
            putIf(metaDataFields, "secret", connectionMetaData.get("secret"));
        }

        if (EntityType.saml20_sp.equals(connection.getProtocol())) {
            List<String> acsLocations = (List<String>) connectionMetaData.getOrDefault("acsLocations", Collections.emptyList());
            IntStream.range(0, acsLocations.size()).forEach(i -> {
                metaDataFields.put("AssertionConsumerService:" + i + ":Location", acsLocations.get(i));
                metaDataFields.put("AssertionConsumerService:" + i + ":Binding", "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST");
            });
        }

        String visibility = (String) connectionMetaData.get("visibility");
        metaDataFields.put("coin:ss:idp_visible_only", Visibility.visible_to_idp_only.name().equals(visibility));
        metaDataFields.put("coin:ss:hidden", Visibility.visible_to_none.name().equals(visibility));

        String connectOption = (String) connectionMetaData.getOrDefault("connectOption", ConnectOptions.connect_with_interaction.name());
        metaDataFields.put("coin:dashboard_connect_option", connectOption);

        return remoteProvider;
    }

    private Map<String, Object> getMetaDataFields(Map<String, Object> data) {
        return (Map<String, Object>) data.get("metaDataFields");
    }

    private Map<String, Object> getData(Map<String, Object> data) {
        return (Map<String, Object>) data.get("data");
    }

    private Map<String, Object> getARP(Map<String, Object> data) {
        return (Map<String, Object>) data.get("arp");
    }

    private Map<String, List<Map<String, Object>>> getARPAttributes(Map<String, Object> data) {
        Map<String, Object> arp = (Map<String, Object>) data.get("arp");
        return (Map<String, List<Map<String, Object>>>) arp.get("attributes");
    }

    //For all attributes that have been changed, we create a single ChangeRequest
    public List<ChangeRequest> deduceChangeRequests(Connection connection,
                                                    Map<String, Object> currentProvider,
                                                    Map<String, Object> auditData) {
        //We need to compare maps, the current data in Manage (e.g. currentProvider) and the new Data in Connection
        //So we need to convert the connection in to the new Map, without modifying the originalMap
        Map clonedProvider = deepClone(currentProvider);
        Map<String, Object> newProvider = this.convert(connection, clonedProvider, false);
        Map<String, Object> newData = getData(newProvider);
        Map<String, Object> currentData = getData(currentProvider);

        List<ChangeRequest> changeRequests = new ArrayList<>();
        Map<String, Object> pathUpdates = new LinkedHashMap<>();
        diffChangeRequestRecursive("", currentData, newData , pathUpdates);
        if (!pathUpdates.isEmpty()) {
            ChangeRequest changeRequest = new ChangeRequest(
                    connection.getManageIdentifier(),
                    connection.getProtocol(),
                    pathUpdates,
                    auditData,
                    false,
                    null);
            changeRequests.add(changeRequest);
        }
        return changeRequests;
    }

    @SneakyThrows
    @SuppressWarnings("unchecked")
    private Map deepClone(Map original) {
        return this.objectMapper.convertValue(original, Map.class);
    }

    @SuppressWarnings("unchecked")
    private void diffChangeRequestRecursive(String path,
                                            Object oldVal,
                                            Object newVal,
                                            Map<String, Object> pathUpdates) {
        if (Objects.equals(oldVal, newVal) || excludedAttributes.contains(path)) {
            return;
        }

        // both maps - recurse on union of keys if the name is not excluded
        if (oldVal instanceof Map && newVal instanceof Map) {
            Map<String, Object> oldMap = (Map<String, Object>) oldVal;
            Map<String, Object> newMap = (Map<String, Object>) newVal;

            Set<String> allKeys = new HashSet<>();
            allKeys.addAll(oldMap.keySet());
            allKeys.addAll(newMap.keySet());

            for (String key : allKeys) {
                String newPath = path.isEmpty() ? key : path + "." + key;
                if (excludedMergeAttributesPaths.contains(newPath)) {
                    pathUpdates.put(path, newVal);
                    return;
                }
                diffChangeRequestRecursive(newPath, oldMap.get(key), newMap.get(key), pathUpdates);
            }
            return;
        }

        // from both lists take the new value
        if (oldVal instanceof List && newVal instanceof List) {
            pathUpdates.put(path, newVal);
            return;
        }

        // if we get here, either type differs or one side is missing
        if (oldVal == null && newVal != null) {
            // added
            pathUpdates.put(path, newVal);
        } else if (oldVal != null && newVal == null) {
            // removed
            pathUpdates.put(path, null);
        } else {
            // changed
            pathUpdates.put(path, newVal);
        }
    }

    private void mergeAllowedEntities(Map<String, Object> data, Map<String, Object> connectionMetaData) {
        List<String> allowedEntities = (List<String>) connectionMetaData.getOrDefault("allowedEntities", List.of());
        data.put("allowedEntities", allowedEntities.stream().map(entity -> Map.of("name", entity)).toList());
    }

    private void mergeAttributeReleasePolicies(Map<String, Object> connectionMetaData, Map<String, Object> data) {
        Map<String, Object> newArp = (Map<String, Object>) connectionMetaData.get("arp");
        Map<String, Object> arpFromManage = (Map<String, Object>) data.get("arp");
        //Merge the two ARP's, ensuring no existing attributes are overridden which are in the excludedARPAttributes
        Map<String, List<Map<String, String>>> existingArpAttributes = (Map<String, List<Map<String, String>>>) arpFromManage.get("attributes");
        Map<String, List<Map<String, String>>> newArpAttributes = (Map<String, List<Map<String, String>>>) newArp.get("attributes");
        existingArpAttributes.entrySet().stream()
                .filter(entry -> excludedARPAttributes.contains(entry.getKey()))
                .forEach(entry -> {
                    if (!newArpAttributes.containsKey(entry.getKey())) {
                        newArpAttributes.put(entry.getKey(), entry.getValue());
                    }
                });
        putIf(data, "arp", newArp);
    }

    private void putIf(Map<String, Object> result, String key, Object value) {
        if ((value instanceof String && StringUtils.hasText((String) value)) || value != null) {
            result.put(key, value);
        }
    }
}
