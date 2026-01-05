package access.manage;

import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;

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
