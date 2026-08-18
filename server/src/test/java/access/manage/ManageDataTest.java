package access.manage;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ManageDataTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void contactPersons() {
        Map<String, Object> provider = provider();
        List<String> emails = ManageData.contactPersons(provider).stream().sorted().toList();
        assertEquals(List.of("admin@surfconext.nl", "support@surfconext.nl", "technical@surfconext.nl"), emails);
    }

    @SneakyThrows
    private Map<String, Object> provider() {
        return objectMapper.readValue(new ClassPathResource("/manage/saml20_sp.expected.json").getInputStream(), new TypeReference<>() {
        });
    }

}