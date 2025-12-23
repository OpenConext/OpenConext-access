package access.api;

import access.exception.InvalidInputException;
import access.manage.ChangeRequest;
import access.manage.Manage;
import access.manage.MetaData;
import access.manage.MetaDataFeedParser;
import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
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

    private static final Log LOG = LogFactory.getLog(ManageController.class);

    private final MetaDataFeedParser metaDataFeedParser = new MetaDataFeedParser();
    private final Manage manage;
    private final Map<String, Object> arpInfo;
    private final List<Map<String, Object>> privacyInfo;

    @SneakyThrows
    public ManageController(Manage manage,
                            ObjectMapper objectMapper) {
        this.manage = manage;
        this.arpInfo = objectMapper.readValue(new ClassPathResource("/metadata/ARP.json").getInputStream(), new TypeReference<>() {
        });
        this.privacyInfo = objectMapper.readValue(new ClassPathResource("/metadata/Privacy.json").getInputStream(), new TypeReference<>() {
        });
    }

    @GetMapping("/arp")
    public ResponseEntity<Map<String, Object>> arp() {
        LOG.debug("/arp");
        return ResponseEntity.ok(this.arpInfo);
    }

    @GetMapping("/privacy")
    public ResponseEntity<List<Map<String, Object>>> privacy() {
        LOG.debug("/privacy");
        return ResponseEntity.ok(this.privacyInfo);
    }

    @SneakyThrows
    @PostMapping("/parse")
    public ResponseEntity<List<MetaData>> parse(@RequestBody Map<String, String> requestBody) {
        List<EntityDescriptor> entityDescriptors;
        Resource resource;
        if (requestBody.containsKey("url")) {
            URL url = new URI(requestBody.get("url")).toURL();
            String protocol = url.getProtocol().toLowerCase();
            if (!List.of("http", "https").contains(protocol)) {
                throw new InvalidInputException("Not allowed protocol: " + protocol);
            }
            resource = new UrlResource(url);
        } else {
            String xml = requestBody.get("xml");
            resource = new ByteArrayResource(xml.getBytes(Charset.defaultCharset()));
        }
        entityDescriptors = metaDataFeedParser.importXML(resource);
        return ResponseEntity.ok(entityDescriptors.stream().map(MetaData::new).toList());
    }

    @SneakyThrows
    @GetMapping("/identity-providers/{environment}")
    public ResponseEntity<List<Map<String, Object>>> identityProviders(@PathVariable("environment") Environment environment) {
        List<Map<String, Object>> providers = manage.providers(environment, EntityType.saml20_idp);
        return ResponseEntity.ok(providers);
    }

    @SneakyThrows
    @PostMapping("/unique-entity-id/{environment}")
    public ResponseEntity<List<Map<String, Object>>> providersByEntityId(@PathVariable("environment") Environment environment,
                                                                         @RequestBody Map<String, String> data) {
        String entityID = data.get("entityID");
        //It does not matter which entityType we use, all services will be queried
        List<Map<String, Object>> providers = manage.uniqueEntityId(environment, EntityType.saml20_sp, entityID);
        return ResponseEntity.ok(providers);
    }

    @SneakyThrows
    @PutMapping("/reject-change-request")
    public ResponseEntity<Map<String, Object>> rejectChangeRequest(@RequestBody ChangeRequest changeRequest) {
        manage.rejectChangeRequest(Environment.PROD, changeRequest);
        return Results.okResult();
    }
}
