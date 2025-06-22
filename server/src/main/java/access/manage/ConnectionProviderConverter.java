package access.manage;

import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hubspot.jinjava.Jinjava;
import com.nimbusds.jose.util.IOUtils;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;

import java.util.Map;

@SuppressWarnings("unchecked")
public class ConnectionProviderConverter {

    private static final Log LOG = LogFactory.getLog(ConnectionProviderConverter.class);

    private final ObjectMapper objectMapper;
    private final Jinjava jinJava;
    private final String template;
    private final State defaultTestState;
    private final State defaultProdState;

    private final TypeReference<Map<String, Object>> typeRef = new TypeReference<>() {
    };

    @SneakyThrows
    public ConnectionProviderConverter(ObjectMapper objectMapper, State defaultTestState, State defaultProdState) {
        this.objectMapper = objectMapper;
        this.jinJava = new Jinjava();
        this.jinJava.registerFilter(new JsonObjectFilter(objectMapper));
        this.template = readTemplate();
        this.defaultTestState = defaultTestState;
        this.defaultProdState = defaultProdState;
    }

    public String convert(Connection connection) {
        Map<String, Object> context = objectMapper.convertValue(connection, typeRef);
        String organizationName = connection.getApplication().getOrganization().getName();
        //TODO Logo, descriptions, Contact information, privacy information from the application metaData
        //Because of @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        context.put("organizationName", organizationName);
        context.put("state", connection.getEnvironment().equals(Environment.TEST) ? defaultTestState : defaultProdState);
        return this.jinJava.render(template, context);
    }

    @SneakyThrows
    private String readTemplate() {
        return IOUtils.readInputStreamToString(new ClassPathResource("/manage/provider_template.j2").getInputStream());
    }

}
