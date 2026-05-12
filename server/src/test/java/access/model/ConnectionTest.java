package access.model;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConnectionTest {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private Connection connection;

    @BeforeEach
    void setUp() {
        connection = new Connection();
    }

    @Test
    void isValid() {
        Connection connection = new Connection();
        assertFalse(connection.isValid());

        connection.setName("name");
        assertFalse(connection.isValid());

        //Need mutability
        HashMap<String, Object> metaData = new HashMap<>();
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
    @SuppressWarnings("unchecked")
    void convertChangeRequests() {
        String json = IOUtils.toString(new ClassPathResource("/manage/change_request_large.json").getInputStream(), Charset.defaultCharset());
        Map<String,Object> manageChangeRequest = objectMapper.readValue(json, Map.class);
        Connection connection = new Connection();
        connection.convertChangeRequests(List.of(manageChangeRequest));
        Map<String, Object> changeRequest = connection.getChangeRequests().getFirst();

        json = IOUtils.toString(new ClassPathResource("/manage/converted_change_request.json").getInputStream(), Charset.defaultCharset());
        Map<String,Object> convertedChangeRequest = objectMapper.readValue(json, Map.class);
        //In case of failures, investigate and if needed, update converted_change_request.json
        //System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(changeRequest));

        assertEquals(changeRequest, convertedChangeRequest);
    }
    // --- complete() ---

    @Test
    void testCompleteOneSection() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );

        assertTrue(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL));
    }

    @Test
    void testCompleteMultipleSections() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION)
        );

        assertTrue(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL));
        assertTrue(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION));
        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.PRODUCTION_STATUS));
    }

    @Test
    void testCompleteAlreadyCompletedSectionIsIdempotent() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );

        assertEquals(ConnectionSectionFlags.TECHNICAL.getValue(), connection.getSectionsComplete());
    }

    // --- uncomplete() ---

    @Test
    void testUncompleteOneSection() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.uncomplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );

        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL));
    }

    @Test
    void testUncompleteOneSectionLeavesOthersIntact() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.uncomplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );

        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL));
        assertTrue(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION));
    }

    @Test
    void testUncompleteAlreadyIncompleteSectionIsIdempotent() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.uncomplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );

        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL));
        assertEquals(0, connection.getSectionsComplete());
    }

    // --- isComplete() ---

    @Test
    void testIsCompleteReturnsFalseOnEmptyFlags() {
        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL));
        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION));
        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.PRODUCTION_STATUS));
    }

    @Test
    void testIsCompleteDoesNotCrossContaminate() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );

        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION));
        assertFalse(ConnectionSectionFlags.isComplete(connection.getSectionsComplete(), ConnectionSectionFlags.PRODUCTION_STATUS));
    }

    // --- allComplete() ---

    @Test
    void testAllCompleteReturnsFalseWhenEmpty() {
        assertFalse(ConnectionSectionFlags.allComplete(connection.getSectionsComplete()));
    }

    @Test
    void testAllCompleteReturnsFalseWhenPartial() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION)
        );

        assertFalse(ConnectionSectionFlags.allComplete(connection.getSectionsComplete()));
    }

    @Test
    void testAllCompleteReturnsTrueWhenAllSet() {
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.TECHNICAL)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.INFORMATION)
        );
        connection.setSectionsComplete(
                ConnectionSectionFlags.complete(connection.getSectionsComplete(), ConnectionSectionFlags.PRODUCTION_STATUS)
        );

        assertTrue(ConnectionSectionFlags.allComplete(connection.getSectionsComplete()));
    }}