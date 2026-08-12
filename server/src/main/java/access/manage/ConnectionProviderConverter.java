package access.manage;

import access.model.Application;
import access.model.ConnectOptions;
import access.model.Connection;
import access.model.EntityType;
import access.model.State;
import access.model.Visibility;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static access.api.ConnectionController.SECRET_LENGTH;
import static access.manage.ManageData.*;

@SuppressWarnings("unchecked")
public class ConnectionProviderConverter {

    private final List<Map<String, Object>> privacyInfo;
    private final List<String> excludedARPAttributes;
    private final List<String> excludedAttributes = List.of("revisionnote");
    private final List<String> excludedMergeAttributesPaths = List.of("arp.attributes");

    private final State defaultState;
    private final ObjectMapper objectMapper;

    @SneakyThrows
    public ConnectionProviderConverter(ObjectMapper objectMapper, State defaultState) {
        this.defaultState = defaultState;
        this.objectMapper = objectMapper;
        InputStream inputStream = new ClassPathResource("/metadata/Privacy.json").getInputStream();
        this.privacyInfo = objectMapper.readValue(inputStream, new TypeReference<>() {
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

    public Map<String, Object> convert(Connection connection,
                                       Map<String, Object> remoteProvider,
                                       boolean changeRequestRequired) {

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
        remoteProvider.put("type", connection.getProtocol().name());
        putIf(remoteProvider, "eid", connection.getManageEid());

        data.put("entityid", connectionMetaData.get("entityID"));
        //Use connection's state if set, otherwise fall back to defaultState
        State connectionState = connection.getState();
        data.put("state", connectionState != null ? connectionState.name() : defaultState.name());

        metaDataFields.put("name:en", connection.getName());
        metaDataFields.put("name:nl", connection.getName());

        putIf(metaDataFields, "description:en", information.get("descriptionEN"));
        putIf(metaDataFields, "description:nl", information.get("descriptionNL"));
        putIf(metaDataFields, "logo:0:url", application.getLogoUrl());

        boolean isResourceServer = connection.getProtocol().equals(EntityType.oauth20_rs);
        if (!isResourceServer) {
            putIf(metaDataFields, "coin:application_name", application.getName());
            putIf(metaDataFields, "coin:application_url", information.get("webSite"));
            List<String> tags = (List<String>) information.getOrDefault("tags", List.of());
            putIf(metaDataFields, "application_tags", tags);
            data.put("allowedall", true);
        }
        convertContactPersons(applicationMetaData, metaDataFields);

        Map<String, String> privacy = (Map<String, String>) applicationMetaData.getOrDefault("privacy", Map.of());
        privacyInfo.forEach(item -> putIf(metaDataFields, (String) item.get("manage"), privacy.get(item.get("name"))));

        metaDataFields.put("OrganizationName:en", application.getOrganization().getName());

        data.put("revisionnote", "SURF Access update with remote API");

        //We have merged everything from the application now, stop if changeRequestRequired
        if (changeRequestRequired) {
            return remoteProvider;
        }
        if (!isResourceServer) {
            mergeAttributeReleasePolicies(connectionMetaData, data);
            data.put("allowedEntities", List.of());
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
            String secret = (String) connectionMetaData.get("secret");
            //Might be an initial secret or a deliberate reset
            if (StringUtils.hasText(secret) && secret.length() == SECRET_LENGTH) {
                putIf(metaDataFields, "secret", connectionMetaData.get("secret"));
            } else {
                putIf(metaDataFields, "secret", metaDataFields.get("secret"));
            }
        }

        if (EntityType.saml20_sp.equals(connection.getProtocol())) {
            List<String> acsLocations = (List<String>) connectionMetaData.getOrDefault("acsLocations", Collections.emptyList());
            IntStream.range(0, acsLocations.size()).forEach(i -> {
                metaDataFields.put("AssertionConsumerService:" + i + ":Location", acsLocations.get(i));
                metaDataFields.put("AssertionConsumerService:" + i + ":Binding", "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST");
            });
        }

        if (isResourceServer) {
            metaDataFields.put("scopes", ((List<Map<String, Object>>) connectionMetaData.getOrDefault("scopes", List.of()))
                .stream()
                .map(scope -> scope.get("value"))
                .toList());
        }

        if (!isResourceServer) {
            String visibility = (String) connectionMetaData.get("visibility");
            metaDataFields.put("coin:ss:idp_visible_only", Visibility.visible_to_idp_only.name().equals(visibility));
            metaDataFields.put("coin:ss:hidden", Visibility.visible_to_none.name().equals(visibility));

            String loginUrl = (String) connectionMetaData.getOrDefault("loginUrl", information.get("webSite"));
            metaDataFields.put("coin:login_url", loginUrl);

            String connectOption = (String) connectionMetaData.getOrDefault("connectOption", ConnectOptions.connect_with_interaction.name());
            metaDataFields.put("coin:dashboard_connect_option", connectOption);
        }

        return remoteProvider;
    }

    public void convertContactPersons(Map<String, Object> applicationMetaData, Map<String, Object> metaDataFields) {
        List<Map<String, String>> contactPersons = ((List<Map<String, String>>) applicationMetaData
            .getOrDefault("contactPersons", Collections.emptyList()))
            .stream()
            .filter(m -> StringUtils.hasText(m.get("email")))
            .toList();
        //First, delete all contact persons before adding them again
        metaDataFields.keySet().removeIf(key -> key.startsWith("contacts:"));

        IntStream.range(0, contactPersons.size()).forEach(i -> {
            Map<String, String> contactPerson = contactPersons.get(i);
            Map.of("type", "contactType",
                    "email", "emailAddress",
                    "givenName", "givenName",
                    "surName", "surName")
                .forEach((k, v) -> putIf(metaDataFields, "contacts:" + i + ":" + v, contactPerson.get(k)));
        });
    }

    //For all attributes that have been changed, we create a single ChangeRequest
    public Optional<ChangeRequest> deduceChangeRequests(Connection connection,
                                                        Map<String, Object> currentProvider) {
        //We need to compare maps, the current data in Manage (e.g. currentProvider) and the new Data in Connection
        //So we need to convert the connection in to the new Map, without modifying the originalMap
        Map clonedProvider = deepClone(currentProvider);
        Map<String, Object> newProvider = this.convert(connection, clonedProvider, false);
        Map<String, Object> newData = getData(newProvider);
        Map<String, Object> currentData = getData(currentProvider);

        Map<String, Object> pathUpdates = new LinkedHashMap<>();
        diffChangeRequestRecursive("", currentData, newData, pathUpdates);
        if (pathUpdatesWarrantChangeRequest(pathUpdates)) {
            ChangeRequest changeRequest = new ChangeRequest(
                connection.getManageIdentifier(),
                connection.getProtocol(),
                pathUpdates,
                false,
                null,
                RequestType.Change);
            return Optional.of(changeRequest);
        }
        return Optional.empty();
    }

    private boolean pathUpdatesWarrantChangeRequest(Map<String, Object> pathUpdates) {
        return !pathUpdates.isEmpty() &&
            (pathUpdates.size() != 1 || !pathUpdates.containsKey("revisionnote"));
    }

    public HashMap<String, Object> convertProviderToApplicationMetaData(Map<String, Object> provider) {
        Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
        HashMap<String, Object> updatedMetaData = new HashMap<>();

        updatedMetaData.put("privacy", this.privacyInfo.stream().collect(Collectors.toMap(
            m -> m.get("name"),
            m -> metaDataFields.getOrDefault(m.get("manage"), "")
        )));

        Map<String, Object> information = new HashMap<>();
        information.put("tags", metaDataFields.getOrDefault("application_tags", new ArrayList<>()));
        information.put("webSite", metaDataFields.get("coin:application_url"));
        information.put("descriptionEN", metaDataFields.get("description:en"));
        information.put("descriptionNL", metaDataFields.get("description:nl"));
        updatedMetaData.put("information", information);

        List<String> contactTypes = List.of("administrative", "technical", "support");
        List<Map<String, Object>> contactPersons = metaDataFields
            .entrySet()
            .stream()
            .filter(entry -> entry.getKey().endsWith(":contactType") &&
                contactTypes.contains((String) entry.getValue()))
            .collect(Collectors.toMap(
                entry -> entry.getKey().split(":")[1],
                entry -> (String) entry.getValue()
            ))
            .entrySet().stream()
            .map(entry -> Map.of(
                "type", entry.getValue(),
                "email", metaDataFields.getOrDefault("contacts:" + entry.getKey() + ":emailAddress", ""),
                "surName", metaDataFields.getOrDefault("contacts:" + entry.getKey() + ":surName", ""),
                "givenName", metaDataFields.getOrDefault("contacts:" + entry.getKey() + ":givenName", "")
            ))
            .toList();
        updatedMetaData.put("contactPersons", contactPersons);

        return updatedMetaData;
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
        if (Objects.equals(oldVal, newVal) || excludedAttributes.contains(path.toLowerCase())) {
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
    }

    private void mergeAttributeReleasePolicies(Map<String, Object> connectionMetaData, Map<String, Object> data) {
        Map<String, Object> newArp = (Map<String, Object>) connectionMetaData.getOrDefault("arp", new HashMap<>());
        Map<String, Object> arpFromManage = (Map<String, Object>) data.getOrDefault("arp", Map.of());
        //Merge the two ARP's, ensuring no existing attributes are overridden which are in the excludedARPAttributes
        Map<String, List<Map<String, String>>> existingArpAttributes = (Map<String, List<Map<String, String>>>) arpFromManage.getOrDefault("attributes", Map.of());
        Map<String, List<Map<String, String>>> newArpAttributes = (Map<String, List<Map<String, String>>>) newArp.getOrDefault("attributes", Map.of());
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
        if (!isEmpty(value)) {
            result.put(key, value);
        }
    }
}
