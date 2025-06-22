package access.manage;

import access.AbstractTest;
import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.nimbusds.jose.util.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static access.manage.MapSorter.toSortedTreeMap;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ConnectionProviderConverterTest extends AbstractTest {

    @Autowired
    private ConnectionProviderConverter connectionProviderConverter;

    @Test
    void convert() throws IOException {
        Connection connection = getConnection();
        String converted = connectionProviderConverter.convert(connection);
        Map<String, Object> map = objectMapper.readValue(converted, new TypeReference<>() {
        });
        Map<String, Object> expected = objectMapper.readValue(IOUtils.readInputStreamToString(
                new ClassPathResource("/manage/oidc10_rp.expected.json").getInputStream()), new TypeReference<>() {
        });
        MapDiffer.printDifferences(toSortedTreeMap(expected), toSortedTreeMap(map));
        assertEquals(expected, map);
    }

    private Connection getConnection() {
        Organization organization = new Organization("ORG name", "example.com");
        Application application = new Application("ShareLogic", organization, Map.of());
        Map<String, Object> metaData = Map.of(
                "entityID", "https://engine.test",
                "redirectUrls", List.of("https://redirect.url"),
                "grantTypes", List.of("authorization_code"),
                "secret", "secret",
                "logoUrl", "https://static.surfconext.nl/media/idp/surfconext.png",
                "pkce", false,
                "arp", Map.of(
                        "enabled", true,
                        "attributes", Map.of(
                                "urn:mace:dir:attribute-def:cn", List.of(
                                        Map.of("value", "*",
                                                "source", "idp",
                                                "motivation", "Because")
                                ),
                                "urn:mace:dir:attribute-def:displayName", List.of(
                                        Map.of("value", "*",
                                                "source", "idp",
                                                "motivation", "Because")
                                )
                        )
                ),
                "contactPersons", List.of(
                        new Contact("technical", "John", "Doe", "jdoe@example.com"),
                        new Contact("support", "Mary", "Doe", "mdoe@example.com")
                ),
                "allowedEntities", List.of(
                        "http://mock-idp",
                        "https://idp.diy.surfconext.nl/saml2/idp/metadata.php"
                )
        );
        Connection connection = new Connection("New Connection", application, metaData, EntityType.oidc10_rp, Environment.TEST);
        connection.setManageIdentifier("123456");
        connection.setManageVersion(2);
        connection.setManageEid(99);
        return connection;
    }

    @Override
    protected boolean seedDatabase() {
        return false;
    }
}