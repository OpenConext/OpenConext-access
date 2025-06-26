package access.manage;

import access.model.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.IntStream;

@SuppressWarnings("unchecked")
public class ConnectionProviderConverter {

    private final ObjectMapper objectMapper;
    private final List<Map<String, Object>> privacyInfo;

    private final State defaultTestState;
    private final State defaultProdState;

    @SneakyThrows
    public ConnectionProviderConverter(ObjectMapper objectMapper, State defaultTestState, State defaultProdState) {
        this.defaultTestState = defaultTestState;
        this.defaultProdState = defaultProdState;
        this.objectMapper = objectMapper;
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
    }

    public String convert(Connection connection) throws JsonProcessingException {
        Application application = connection.getApplication();
        //Combine the two metaData maps
        Map<String, Object> connectionMetaData = connection.getMetaData();
        Map<String, Object> applicationMetaData = application.getMetaData();
        Map<String, Object> information = (Map<String, Object>) applicationMetaData.getOrDefault("information", Map.of());

        //Base structure
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> data = new HashMap<>();
        Map<String, Object> metaDataFields = new HashMap<>();
        data.put("metaDataFields", metaDataFields);
        result.put("data", data);

        putIf(result, "id", connection.getManageIdentifier());
        putIf(result, "version", connection.getManageVersion());
        result.put("type", connection.getProtocol());
        putIf(result, "eid", connection.getManageEid());

        data.put("entityid", connectionMetaData.get("entityID"));
        data.put("state", connection.getEnvironment().equals(Environment.TEST) ? defaultTestState : defaultProdState);
        data.put("allowedall", false);
        putIf(data, "arp", connectionMetaData.get("arp"));

        List<String> allowedEntities = (List<String>) connectionMetaData.getOrDefault("allowedEntities", List.of());
        data.put("allowedEntities", allowedEntities.stream().map(entity -> Map.of("name", entity)).toList());

        metaDataFields.put("name:en", connection.getName());
        metaDataFields.put("name:nl", connection.getName());

        putIf(metaDataFields, "logo:0:url", application.getLogoUrl());

        putIf(metaDataFields, "description:en", information.get("descriptionEN"));
        putIf(metaDataFields, "description:nl", information.get("descriptionNL"));
        putIf(metaDataFields, "coin:application_url", information.get("webSite"));
        List<String> tags = (List<String>) information.getOrDefault("tags", List.of());
        putIf(metaDataFields, "coin:ss:type_of_service:en", String.join(" ", tags));
        putIf(metaDataFields, "coin:ss:type_of_service:nl", String.join(" ", tags));

        if (EntityType.oidc10_rp.equals(connection.getProtocol())) {
            List<String> grantTypes = (List<String>) connectionMetaData.get("grantTypes");
            putIf(metaDataFields, "grants", grantTypes);
            putIf(metaDataFields, "redirectUrls", connectionMetaData.get("redirectUrls"));
            metaDataFields.put("isPublicClient", connectionMetaData.getOrDefault("pkce", false));
            metaDataFields.put("accessTokenValidity", 3600);
            if (grantTypes.contains("refresh_token")) {
                metaDataFields.put("refreshTokenValidity", 3600);
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

        List<Map<String, String>> contactPersons = (List<Map<String, String>>) applicationMetaData.getOrDefault("contactPersons", Collections.emptyList());
        IntStream.range(0, contactPersons.size()).forEach(i -> {
            Map<String, String> contactPerson = contactPersons.get(i);
            Map.of("type","contactType","email", "emailAddress", "givenName","givenName", "surName", "surName")
                    .forEach((k,v) -> putIf(metaDataFields, "contacts:" + i + ":" + v, contactPerson.get(k)));
        });
        Map<String, String> privacy = (Map<String, String>) applicationMetaData.getOrDefault("privacy", Map.of());
        privacyInfo.forEach(item -> putIf(metaDataFields, (String) item.get("manage"), privacy.get(item.get("name"))));

        metaDataFields.put("OrganizationName:en", application.getOrganization().getName());
        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
    }

    private void putIf(Map<String, Object> result, String key, Object value) {
        if ((value instanceof String && StringUtils.hasText((String) value)) || value != null) {
            result.put(key, value);
        }
    }
}
