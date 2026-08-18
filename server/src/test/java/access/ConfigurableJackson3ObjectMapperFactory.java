package access;

import access.config.ObjectMapperHolder;
import io.restassured.path.json.mapper.factory.DefaultJackson3ObjectMapperFactory;
import tools.jackson.databind.ObjectMapper;

import java.lang.reflect.Type;

public class ConfigurableJackson3ObjectMapperFactory extends DefaultJackson3ObjectMapperFactory {

    private final static ObjectMapper objectMapper = new ObjectMapperHolder().objectMapper();

    @Override
    public ObjectMapper create(Type cls, String charset) {
        return ConfigurableJackson3ObjectMapperFactory.objectMapper;
    }
}
