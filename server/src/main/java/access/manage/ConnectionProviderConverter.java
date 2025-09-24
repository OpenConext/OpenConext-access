package access.manage;

import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.IntStream;

@SuppressWarnings("unchecked")
public class ConnectionProviderConverter {

    private final List<Map<String, Object>> privacyInfo;

    private final State defaultTestState;
    private final State defaultProdState;

    @SneakyThrows
    public ConnectionProviderConverter(ObjectMapper objectMapper, State defaultTestState, State defaultProdState) {
        this.defaultTestState = defaultTestState;
        this.defaultProdState = defaultProdState;
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
    }

    public Map<String, Object> convert(Connection connection, Map<String, Object> result) {
        Application application = connection.getApplication();
        //We need data both from the connection and the application
        Map<String, Object> connectionMetaData = connection.getMetaData();
        Map<String, Object> applicationMetaData = application.getMetaData();
        Map<String, Object> information = (Map<String, Object>) applicationMetaData.getOrDefault("information", Map.of());

        //Base structure
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        Map<String, Object> metaDataFields = (Map<String, Object>) data.get("metaDataFields");

        //Now copy all information from the connection to the data / metadata
        putIf(result, "id", connection.getManageIdentifier());
        putIf(result, "version", connection.getManageVersion());
        result.put("type", connection.getProtocol().name());
        putIf(result, "eid", connection.getManageEid());


        data.put("entityid", connectionMetaData.get("entityID"));
        data.put("state", (connection.getEnvironment().equals(Environment.TEST) ? defaultTestState : defaultProdState).name());
        data.put("allowedall", false);
        data.put("revisionnote", "SURF Access update with remote API");

        mergeAttributeReleasePolicies(connectionMetaData, data);
        mergeAllowedEntities(data, connectionMetaData);

        metaDataFields.put("name:en", connection.getName());
        metaDataFields.put("name:nl", connection.getName());

        putIf(metaDataFields, "logo:0:url", application.getLogoUrl());
        putIf(metaDataFields, "coin:application_name", application.getName());

        putIf(metaDataFields, "description:en", information.get("descriptionEN"));
        putIf(metaDataFields, "description:nl", information.get("descriptionNL"));
        putIf(metaDataFields, "coin:application_url", information.get("webSite"));
        List<String> tags = (List<String>) information.getOrDefault("tags", List.of());
        putIf(metaDataFields, "application_tags", tags);

        if (EntityType.oidc10_rp.equals(connection.getProtocol())) {
            List<String> grantTypes = (List<String>) connectionMetaData.get("grantTypes");
            putIf(metaDataFields, "grants", grantTypes);
            putIf(metaDataFields, "redirectUrls", connectionMetaData.get("redirectUrls"));
            metaDataFields.put("isPublicClient", connectionMetaData.getOrDefault("pkce", false));
            metaDataFields.put("accessTokenValidity", 3600);
            if (grantTypes.contains("refresh_token")) {
                String refreshTokenValidity = (String) connectionMetaData.getOrDefault("refreshTokenValidity", "3600");
                metaDataFields.put("refreshTokenValidity", Integer.parseInt(refreshTokenValidity));
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

        List<Map<String, String>> contactPersons = (List<Map<String, String>>) applicationMetaData.getOrDefault("contactPersons", Collections.emptyList());
        IntStream.range(0, contactPersons.size()).forEach(i -> {
            Map<String, String> contactPerson = contactPersons.get(i);
            Map.of("type", "contactType", "email", "emailAddress", "givenName", "givenName", "surName", "surName")
                    .forEach((k, v) -> putIf(metaDataFields, "contacts:" + i + ":" + v, contactPerson.get(k)));
        });
        Map<String, String> privacy = (Map<String, String>) applicationMetaData.getOrDefault("privacy", Map.of());
        privacyInfo.forEach(item -> putIf(metaDataFields, (String) item.get("manage"), privacy.get(item.get("name"))));

        metaDataFields.put("OrganizationName:en", application.getOrganization().getName());
        return result;
    }

    private void mergeAllowedEntities(Map<String, Object> data, Map<String, Object> connectionMetaData) {
        List<String> existingAllowedEntities = ((List<Map<String, String>>) data.getOrDefault("allowedEntities", new ArrayList<>()))
                .stream().map(m -> m.get("name"))
                .toList();
        List<String> newAllowedEntities = (List<String>) connectionMetaData.getOrDefault("allowedEntities", List.of());
        Set<String> uniqueAllowedEntities = new LinkedHashSet<>(existingAllowedEntities);
        uniqueAllowedEntities.addAll(newAllowedEntities);
        data.put("allowedEntities", uniqueAllowedEntities.stream().map(entity -> Map.of("name", entity)).toList());
    }

    private void mergeAttributeReleasePolicies(Map<String, Object> connectionMetaData, Map<String, Object> data) {
        Map<String, Object> newArp = (Map<String, Object>) connectionMetaData.get("arp");
        Map<String, Object> arpFromManage = (Map<String, Object>) data.get("arp");
        //Merge the two ARP's, ensuring no existing data is overridden
        Map<String, List<Map<String, String>>> existingArpAttributes = (Map<String, List<Map<String, String>>>) arpFromManage.get("attributes");
        Map<String, List<Map<String, String>>> newArpAttributes = (Map<String, List<Map<String, String>>>) newArp.get("attributes");
        existingArpAttributes.entrySet().stream().forEach(entry -> {
            if (newArpAttributes.containsKey(entry.getKey())) {
                Map<String, String> arpEntry = newArpAttributes.get(entry.getKey()).getFirst();
                Map<String, String> existingArpEntry = entry.getValue().getFirst();
                existingArpEntry.put("motivation", arpEntry.get("motivation"));
            }
            newArpAttributes.put(entry.getKey(), entry.getValue());
        });
        putIf(data, "arp", newArp);
    }

    private void putIf(Map<String, Object> result, String key, Object value) {
        if ((value instanceof String && StringUtils.hasText((String) value)) || value != null) {
            result.put(key, value);
        }
    }
}
