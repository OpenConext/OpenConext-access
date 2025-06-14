package access.manage;

import access.AbstractTest;
import access.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hubspot.jinjava.Jinjava;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConnectionProviderConverterTest extends AbstractTest {

    @Test
    void convert() {
        ConnectionProviderConverter converter = new ConnectionProviderConverter(super.objectMapper);

        Connection connection = getConnection();
        String converted = converter.convert(connection);
        System.out.println(converted);

        Jinjava jinjava = new Jinjava();

        Map<String, Object> context = new HashMap<>();
        context.put("protocol", "oidc_rp");

        String template = "\"type\": \"{{ protocol }}\"";

        String rendered = jinjava.render(template, context);
        System.out.println(rendered);
    }

    private Connection getConnection() {
        Organization organization = new Organization("ORG name", "example.com");
        Application application = new Application("ShareLogic", organization, Map.of());
        Map<String, Object> metaData = Map.of(
                "entityID", "https://engine.test",
                "redirectUrls", List.of("https://redirect.url") ,
                "grants", List.of("authorization_code")
        );

        Connection connection = new Connection("New Connection", application, metaData, EntityType.oidc10_rp, Environment.TEST);
        connection.setManageIdentifier("123456");
        connection.setManageVersion(2);
        return connection;
    }

    @Override
    protected boolean seedDatabase() {
        return false;
    }
}