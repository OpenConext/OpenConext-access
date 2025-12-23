package access.api;

import access.manage.Manage;
import access.manage.ManageData;
import access.model.EntityType;
import access.model.Environment;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = {"/api/v1/public"}, produces = MediaType.APPLICATION_JSON_VALUE)
public class PublicController {

    private static final Log LOG = LogFactory.getLog(PublicController.class);

    private final Manage manage;

    @SneakyThrows
    public PublicController(Manage manage) {
        this.manage = manage;
    }

    @GetMapping("/service-providers")
    public ResponseEntity<List<Map<String, Object>>> serviceProviders() {
        LOG.debug("/serviceProviders");
        return ResponseEntity.ok(manage.serviceProvidersLight(Environment.PROD));
    }

    @GetMapping("/identity-providers")
    public ResponseEntity<List<Map<String, Object>>> identityProviders() {
        LOG.debug("/identityProviders");
        return ResponseEntity.ok(manage.identityProvidersLight(Environment.PROD));
    }

    @GetMapping("/service-provider-detail/{type}/{identifier}")
    public ResponseEntity<Map<String, Object>> serviceProviderDetail(
            @PathVariable("type") EntityType entityType,
            @PathVariable("identifier") String identifier) {
        LOG.debug("/identityProviders");
        Map<String, Object> provider = manage
                .providerById(entityType, identifier, Environment.PROD);
        ManageData.getMetaDataFields(ManageData.getData(provider)).keySet()
                .removeIf(key -> key.startsWith("contacts:"));
        return ResponseEntity.ok(provider);
    }


}
