package access.manage;

import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@SuppressWarnings({"unchecked", "rawtypes"})
public class ManageData {

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
