package access.manage;

import access.AbstractTest;
import access.model.Application;
import access.model.Connection;
import access.model.Organization;
import access.model.State;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.util.IOUtils;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SuppressWarnings("unchecked")
class ConnectionProviderConverterTest {

    private final ConnectionProviderConverter connectionProviderConverter =
        new ConnectionProviderConverter(new ObjectMapper(), State.prodaccepted);


    @Test
    void mergeAttributeReleasePolicies() {
        Map<String, Object> provider = new HashMap<>();
        Map<String, Object> attributes = new HashMap<>();

        attributes.put("attributes", mutableMapOf(
            "urn:mace:surf.nl:attribute-def:surf-autorisaties", mutableArpEntry("invite", "regexp"),
            "urn:mace:dir:attribute-def:mail", mutableArpEntry("eduid", "*")
        ));
        provider.put("arp", attributes);

        Map<String, Object> connectionMetaData = mutableMapOf(
            "arp", mutableMapOf(
                "attributes", mutableMapOf(
                    "urn:mace:dir:attribute-def:sn", mutableArpEntry("idp", "*"),
                    "urn:mace:dir:attribute-def:mail", mutableArpEntry("idp", "*")
                )
            )
        );
        connectionProviderConverter.mergeAttributeReleasePolicies(connectionMetaData, provider);

        Map<String, Object> updatedArp = (Map<String, Object>) provider.get("arp");
        Map<String, List<Map<String, String>>> newArpAttributes = (Map<String, List<Map<String, String>>>) updatedArp.get("attributes");

        Map<String, String> autorisatie = newArpAttributes.get("urn:mace:surf.nl:attribute-def:surf-autorisaties").getFirst();
        assertEquals("invite", autorisatie.get("source"));
        assertEquals("regexp", autorisatie.get("value"));

        Map<String, String> mail = newArpAttributes.get("urn:mace:dir:attribute-def:mail").getFirst();
        assertEquals("eduid", mail.get("source"));
        assertEquals("*", mail.get("value"));

        Map<String, String> sn = newArpAttributes.get("urn:mace:dir:attribute-def:sn").getFirst();
        assertEquals("idp", sn.get("source"));
        assertEquals("*", sn.get("value"));
    }

    private List<Map<String, String>> mutableArpEntry(String source, String value) {
        Map<String, String> entry = new HashMap<>();
        entry.put("source", source);
        entry.put("value", value);
        return List.of(entry);
    }

    private <K, V> Map<K, V> mutableMapOf(Object... kv) {
        Map<K, V> map = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            map.put((K) kv[i], (V) kv[i + 1]);
        }
        return map;
    }

}
