package access.api;

import access.exception.InvalidInputException;
import access.model.EntityType;
import access.manage.Manage;
import access.manage.MetaData;
import access.manage.MetaDataFeedParser;
import lombok.SneakyThrows;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = {"/api/v1/manage"}, produces = MediaType.APPLICATION_JSON_VALUE)
public class ManageController {

    private final MetaDataFeedParser metaDataFeedParser = new MetaDataFeedParser();
    private final Manage manage;

    public ManageController(Manage manage) {
        this.manage = manage;
    }

    @SneakyThrows
    @PostMapping("/parse")
    public ResponseEntity<List<MetaData>> parse(@RequestBody Map<String, String> requestBody) {
        List<EntityDescriptor> entityDescriptors;
        if (requestBody.containsKey("url")) {
            URL url = new URI(requestBody.get("url")).toURL();
            String protocol = url.getProtocol().toLowerCase();
            if (!List.of("http", "https").contains(protocol)) {
                throw new InvalidInputException("Not allowed protocol: " + protocol);
            }
            entityDescriptors = metaDataFeedParser.importXML(new UrlResource(url));
        } else {
            String xml = requestBody.get("xml");
            entityDescriptors = metaDataFeedParser.importXML(new ByteArrayResource(xml.getBytes(Charset.defaultCharset())));
        }
        return ResponseEntity.ok(entityDescriptors.stream().map(MetaData::new).toList());
    }

    @SneakyThrows
    @GetMapping("/identity-providers")
    public ResponseEntity<List<Map<String, Object>>> identityProviders() {
        List<Map<String, Object>> providers = manage.providers(EntityType.saml20_idp);
        return ResponseEntity.ok(providers);
    }

}
