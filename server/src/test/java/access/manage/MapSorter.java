package access.manage;

import java.util.*;

public class MapSorter {

    @SuppressWarnings("unchecked")
    public static Map<String, Object> toSortedTreeMap(Map<String, Object> input) {
        Map<String, Object> result = new TreeMap<>();

        for (Map.Entry<String, Object> entry : input.entrySet()) {
            Object value = entry.getValue();

            if (value instanceof Map) {
                // Recursively sort nested map
                result.put(entry.getKey(), toSortedTreeMap((Map<String, Object>) value));
            } else if (value instanceof List) {
                // Optional: handle list of maps recursively
                result.put(entry.getKey(), sortListIfNeeded((List<?>) value));
            } else {
                result.put(entry.getKey(), value);
            }
        }

        return result;
    }

    // Optional: recursively sort maps inside lists
    @SuppressWarnings("unchecked")
    private static List<Object> sortListIfNeeded(List<?> list) {
        List<Object> sortedList = new ArrayList<>();

        for (Object item : list) {
            if (item instanceof Map) {
                sortedList.add(toSortedTreeMap((Map<String, Object>) item));
            } else {
                sortedList.add(item);
            }
        }

        return sortedList;
    }
}
