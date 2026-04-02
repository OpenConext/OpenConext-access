package access.manage;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public class ListMerger {

    private ListMerger() {
    }

    public static List<String> threeWayMerge(
            List<String> base,   // list1: original
            List<String> left,   // list2: your changes
            List<String> right   // list3: their changes
    ) {
        // Compute diffs against the base
        Map<Integer, String> leftChanges = diff(base, left);
        Map<Integer, String> rightChanges = diff(base, right);

        // Start from the longer of left/right to preserve additions
        int maxSize = Math.max(left.size(), right.size());
        List<String> result = new ArrayList<>();

        for (int i = 0; i < maxSize; i++) {
            boolean leftChanged = leftChanges.containsKey(i);
            boolean rightChanged = rightChanges.containsKey(i);

            if (leftChanged && rightChanged) {
                String leftVal = leftChanges.get(i);
                String rightVal = rightChanges.get(i);

                if (Objects.equals(leftVal, rightVal)) {
                    // Both made the same change — no real conflict
                    if (leftVal != null) result.add(leftVal);
                } else if (i >= base.size()) {
                    // ✅ CHANGED: both added different items past the end of base — keep both
                    if (leftVal != null) result.add(leftVal);
                    if (rightVal != null) result.add(rightVal);
                } else {
                    // True conflict on an existing line: prefer left
                    if (leftVal != null) {
                        result.add(leftVal);
                    }
                }
            } else if (leftChanged) {
                // Only left modified this index
                String val = leftChanges.get(i);
                if (val != null) result.add(val);   // null = deleted

            } else if (rightChanged) {
                // Only right modified this index
                String val = rightChanges.get(i);
                if (val != null) result.add(val);   // null = deleted

            } else {
                // Neither side touched this index — take from base
                if (i < base.size()) result.add(base.get(i));
            }
        }

        return new LinkedHashSet<>(result).stream().toList();
    }

    /**
     * Produces a map of { index → newValue } representing what changed.
     * A null value means "deleted at this index".
     * Indices beyond base.size() are pure additions.
     */
    private static Map<Integer, String> diff(List<String> base, List<String> updated) {
        Map<Integer, String> changes = new HashMap<>();
        int maxLen = Math.max(base.size(), updated.size());

        for (int i = 0; i < maxLen; i++) {
            String baseVal = i < base.size() ? base.get(i) : null;
            String updatedVal = i < updated.size() ? updated.get(i) : null;

            if (!Objects.equals(baseVal, updatedVal)) {
                changes.put(i, updatedVal); // null = deletion
            }
        }
        return changes;
    }
}
