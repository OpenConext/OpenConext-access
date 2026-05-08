package access.manage;

import access.AbstractTest;
import access.model.Application;
import access.model.Connection;
import access.model.Organization;
import com.fasterxml.jackson.core.type.TypeReference;
import com.nimbusds.jose.util.IOUtils;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SuppressWarnings("unchecked")
class ConnectionProviderConverterTest extends AbstractTest {

    @Autowired
    private ConnectionProviderConverter connectionProviderConverter;

    @Autowired
    private Manage manage;

    @Test
    void convertConnections() {
        Map.of(
                "/manage/rp_connection.json",
                "/manage/oidc10_rp.expected.json",
                "/manage/sp_connection.json",
                "/manage/saml20_sp.expected.json"
        ).forEach(this::doConvertConnection);
    }

    @Test
    void deduceChangeRequests() {
        Connection connection = connectionRepository.findDetailsById(seedIdentifiers.get(BUDDY_CHECK_PROD)).get();
        connection.setManageIdentifier("5");
        Map<String, Object> provider = localManage.providerByConnection(connection);
        Optional<ChangeRequest> changeRequestOptional = connectionProviderConverter.deduceChangeRequests(connection, provider);
        assertTrue(changeRequestOptional.isPresent());
        ChangeRequest changeRequest = changeRequestOptional.get();
        assertEquals(19, changeRequest.getPathUpdates().size());
    }

    @SneakyThrows
    private void doConvertConnection(String connectionPath, String expectedPath) {
        Connection connection = readJson(connectionPath, Connection.class);
        Application application = readJson("/manage/application.json", Application.class);
        Organization organization = new Organization("ORG name", "example.com");
        application.setOrganization(organization);
        connection.setApplication(application);

        Map<String, Object> converted = connectionProviderConverter.convert(connection, manage.baseStructureProvider(), false);

        Map<String, Object> expected = objectMapper.readValue(IOUtils.readInputStreamToString(
                new ClassPathResource(expectedPath).getInputStream()), new TypeReference<>() {
        });
        List<String> differences = differences(toSortedTreeMap(expected), toSortedTreeMap(converted));
        if (!differences.isEmpty()) {
            //Easy to compare sorted maps / lists in case of failures
            System.out.println(differences);
        }
        assertEquals(expected, converted);
    }


    @SneakyThrows
    private <T> T readJson(String path, Class<T> clazz) {
        return objectMapper.readValue(IOUtils.readInputStreamToString(
                new ClassPathResource(path).getInputStream()), clazz);
    }

    private Map<String, Object> toSortedTreeMap(Map<String, Object> input) {
        Map<String, Object> result = new TreeMap<>();

        input.forEach((key, value) -> {
            if (value instanceof Map) {
                result.put(key, toSortedTreeMap((Map<String, Object>) value));
            } else if (value instanceof List) {
                result.put(key, sortListIfNeeded((List<?>) value));
            } else {
                result.put(key, value);
            }

        });
        return result;
    }

    private List<Object> sortListIfNeeded(List<?> list) {
        List<Object> sortedList = new ArrayList<>();
        list.forEach(item -> {
            if (item instanceof Map) {
                sortedList.add(toSortedTreeMap((Map<String, Object>) item));
            } else {
                sortedList.add(item);
            }
        });
        return sortedList;
    }

    private List<String> differences(Map<String, Object> left, Map<String, Object> right) {
        return differencesRecursive(left, right, "", new ArrayList<>());
    }

    private List<String> differencesRecursive(Map<String, Object> left, Map<String, Object> right, String path, List<String> differences) {
        Set<String> allKeys = new TreeSet<>();
        allKeys.addAll(left.keySet());
        allKeys.addAll(right.keySet());
        allKeys.forEach(key -> {

        });
        for (String key : allKeys) {
            String fullPath = path.isEmpty() ? key : path + "." + key;
            Object val1 = left.get(key);
            Object val2 = right.get(key);

            if (!left.containsKey(key)) {
                differences.add(String.format("Only in right: %s = %s%n", fullPath, val2));
            } else if (!right.containsKey(key)) {
                differences.add(String.format("Only in left: %s = %s%n", fullPath, val2));
            } else if (val1 instanceof Map && val2 instanceof Map) {
                differencesRecursive((Map<String, Object>) val1, (Map<String, Object>) val2, fullPath, differences);
            } else if (!Objects.equals(val1, val2)) {
                differences.add(String.format("Different at %s: left=%s, right=%s%n", fullPath, val1, val2));
            }
        }
        return differences;
    }


}