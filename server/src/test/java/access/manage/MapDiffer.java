package access.manage;

import java.util.*;

public class MapDiffer {

    public static void printDifferences(Map<String, Object> left, Map<String, Object> right) {
        printDifferencesRecursive(left, right, "");
    }

    @SuppressWarnings("unchecked")
    private static void printDifferencesRecursive(Map<String, Object> left, Map<String, Object> right, String path) {
        Set<String> allKeys = new TreeSet<>();
        allKeys.addAll(left.keySet());
        allKeys.addAll(right.keySet());

        for (String key : allKeys) {
            String fullPath = path.isEmpty() ? key : path + "." + key;
            Object val1 = left.get(key);
            Object val2 = right.get(key);

            if (!left.containsKey(key)) {
                System.out.printf("Only in right: %s = %s%n", fullPath, val2);
            } else if (!right.containsKey(key)) {
                System.out.printf("Only in left: %s = %s%n", fullPath, val1);
            } else if (val1 instanceof Map && val2 instanceof Map) {
                printDifferencesRecursive((Map<String, Object>) val1, (Map<String, Object>) val2, fullPath);
            } else if (!Objects.equals(val1, val2)) {
                System.out.printf("Different at %s: left=%s, right=%s%n", fullPath, val1, val2);
            }
        }
    }
}
