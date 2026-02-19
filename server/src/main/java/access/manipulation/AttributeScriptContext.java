package access.manipulation;


import lombok.Getter;

import java.util.*;
import java.util.stream.Collectors;

@Getter
public class AttributeScriptContext {

    private final Map<String, List<String>> attributes;
    private final String subjectId;

    public AttributeScriptContext(Map<String, List<String>> attributes, String subjectId) {
        this.attributes = attributes;
        this.subjectId = subjectId;
    }

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
