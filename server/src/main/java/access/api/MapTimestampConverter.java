package access.api;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

public class MapTimestampConverter {

    private MapTimestampConverter() {
    }

    public static Map<String, Object> convertTimestamps(Map<String, Object> row, String... keys) {
        Map<String, Object> result = new HashMap<>(row);
        for (String key : keys) {
            if (result.get(key) instanceof LocalDateTime localDateTime) {
                result.put(key, localDateTime.atZone(ZoneId.systemDefault()).toInstant());
            }
        }
        return result;
    }

}
