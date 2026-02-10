package access.manage;

import access.api.ApplicationController;
import access.model.Application;
import access.model.Connection;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@SuppressWarnings({"unchecked", "rawtypes"})
public class ManageData {

    private static Set<String> secrets = Set.of("secret", "originalSecret");

    private ManageData() {
    }

    public static Map<String, Object> getMetaDataFields(Map<String, Object> data) {
        return (Map<String, Object>) data.get("metaDataFields");
    }

    public static Map<String, Object> getData(Map<String, Object> provider) {
        return (Map<String, Object>) provider.get("data");
    }

    public static String getProviderName(Map<String, Object> provider) {
        Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
        return (String) metaDataFields.get("name:en");
    }

    public static String getEntityID(Map<String, Object> provider) {
        Map<String, Object> data = getData(provider);
        return (String) data.get("entityid");
    }

    public static List<String> contactPersons(Map<String, Object> provider) {
        Pattern pattern = Pattern.compile("contacts:[0-9]:contactType");
        List contactTypes = List.of("technical", "support", "administrative");
        Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
        return metaDataFields.keySet()
                .stream()
                .filter(key -> pattern.matcher(key).matches() && contactTypes.contains(metaDataFields.get(key)))
                .map(key -> (String) metaDataFields.get(key.replace("contactType", "emailAddress")))
                .toList();

    }

    public static void removeSecrets(Map<String, Object> application) {
            List<Map<String, Object>> connections = (List<Map<String, Object>>) application.getOrDefault("connections", List.of());
            connections.forEach(connection -> {
                Map<String, Object> metaData = (Map<String, Object>) connection.getOrDefault("metaData", Map.of());
                metaData.keySet().removeIf(key -> secrets.contains(key));
            });
    }

    public static void removeSecrets(Application application) {
        Set<Connection> connections = application.getConnections();
        connections.forEach(connection -> {
            HashMap<String, Object> metaData = connection.getMetaData();
            metaData.keySet().removeIf(key -> secrets.contains(key));
        });
    }


    public static boolean isEmpty(Object object) {
        return switch (object) {
            case List l -> l.isEmpty();
            case String s -> !StringUtils.hasText(s);
            case Map m -> m.isEmpty();
            case null -> true;
            default -> false;
        };
    }

}
