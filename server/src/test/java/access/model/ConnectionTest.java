package access.model;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConnectionTest {

    @Test
    void isValid() {
        Connection connection = new Connection();
        assertFalse(connection.isValid());

        connection.setName("name");
        assertFalse(connection.isValid());

        //Need mutability
        Map<String, Object> metaData = new HashMap<>();
        metaData.put("entityID", "http://mock-rp");
        connection.setMetaData(metaData);
        assertFalse(connection.isValid());

        metaData.put("redirectUrls", List.of("http://redirect.org"));
        assertFalse(connection.isValid());

        metaData.put("grantTypes", List.of(GrantType.AUTHORIZATION_CODE));
        assertTrue(connection.isValid());

        connection.setProtocol(EntityType.saml20_sp);
        assertFalse(connection.isValid());

        metaData.put("acsLocations", List.of("http://accs.org"));
        assertTrue(connection.isValid());
    }
}