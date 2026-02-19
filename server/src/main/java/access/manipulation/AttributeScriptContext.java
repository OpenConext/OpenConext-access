package access.manipulation;


import java.util.*;
import java.util.stream.Collectors;

public record AttributeScriptContext(Map<String, List<String>> attributes, String subjectId) {

    public List<String> get(String name) {
        return attributes.getOrDefault(name, List.of());
    }

    public void set(String name, List<String> values) {
        attributes.put(name, new ArrayList<>(values));
    }

    public void remove(String name) {
        attributes.remove(name);
    }

    public List<String> mapValues(String name, Map<String, String> mapping) {
        return get(name).stream()
                .map(mapping::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}
