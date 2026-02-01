package access.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.hypersistence.utils.hibernate.type.util.JsonSerializer;

public class CloningJsonSerializer implements JsonSerializer {

    private final ObjectMapper objectMapper;

    public CloningJsonSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T clone(T value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String) {
            return value;
        }
        // Serialize and deserialize back to clone
        return (T) objectMapper.convertValue(value, value.getClass());
    }
}