package access.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.hypersistence.utils.hibernate.type.util.JsonSerializer;
import io.hypersistence.utils.hibernate.type.util.JsonSerializerSupplier;

public class CloningJsonSerializerSupplier implements JsonSerializerSupplier {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public JsonSerializer get() {
        return new CloningJsonSerializer(objectMapper);
    }
}