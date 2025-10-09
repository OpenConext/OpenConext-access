package access.model;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConnectionTest {

    private static final ObjectMapper objectMapper = new ObjectMapper();

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

    @SneakyThrows
    @Test
    void setChangeRequests() {
        String json = IOUtils.toString(new ClassPathResource("/manage/change_request_large.json").getInputStream(), Charset.defaultCharset());
        Connection connection = new Connection();
        Map<String,Object> manageChangeRequest = objectMapper.readValue(json, Map.class);
        connection.setChangeRequests(List.of(manageChangeRequest));
        Map<String, Object> changeRequest = connection.getChangeRequests().getFirst();
        System.out.println(changeRequest);
    }
}