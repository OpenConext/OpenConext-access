package access.manage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hubspot.jinjava.interpret.JinjavaInterpreter;
import com.hubspot.jinjava.lib.filter.Filter;
import lombok.SneakyThrows;

public class JsonArrayFilter implements Filter {

    private final ObjectMapper objectMapper;

    public JsonArrayFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getName() {
        return "array_to_json";
    }

    @SneakyThrows
    @Override
    public Object filter(Object var, JinjavaInterpreter interpreter, String... args) {
        return objectMapper.writeValueAsString(var);
    }
}
