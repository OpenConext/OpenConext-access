package access.manage;

import access.model.Application;
import access.model.Connection;
import access.model.EntityType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hubspot.jinjava.Jinjava;
import com.nimbusds.jose.util.IOUtils;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.io.ClassPathResource;

import java.util.Map;

@SuppressWarnings("unchecked")
public class ConnectionProviderConverter {

    private static final Log LOG = LogFactory.getLog(ConnectionProviderConverter.class);

    private final ObjectMapper objectMapper;
    private final Jinjava jinJava;
    private final Map<EntityType, String> templates;
    private final TypeReference<Map<String, Object>> typeRef = new TypeReference<>() {
    };

    @SneakyThrows
    public ConnectionProviderConverter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.jinJava = new Jinjava();
        this.jinJava.registerFilter(new JsonArrayFilter(objectMapper));
        this.templates = Map.of(
                EntityType.oidc10_rp, readTemplate(EntityType.oidc10_rp),
                EntityType.saml20_sp, readTemplate(EntityType.saml20_sp)
        );
    }

    public String convert(Connection connection) {
        Map<String, Object> context = objectMapper.convertValue(connection, typeRef);
        Application application = connection.getApplication();
        //Because of  @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        context.put("application", objectMapper.convertValue(application, typeRef));
        ((Map) context.get("application")).put("organization", objectMapper.convertValue(application.getOrganization(), typeRef));

        String template = this.templates.get(connection.getProtocol());
        return this.jinJava.render(template, context);
    }

    public Connection convert(Map<String, Object> provider) {
        return new Connection(provider);
    }

    @SneakyThrows
    private String readTemplate(EntityType entityType) {
        return IOUtils.readInputStreamToString(
                new ClassPathResource(String.format("/manage/%s.j2", entityType.name()))
                        .getInputStream());
    }

}
