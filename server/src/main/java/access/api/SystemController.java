package access.api;

import access.config.Config;
import access.cron.ResourceCleaner;
import access.exception.NotAllowedException;
import access.model.User;
import access.seed.Demo;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/system"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
public class SystemController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(SystemController.class);

    private final ResourceCleaner resourceCleaner;
    private final Config config;
    private final Demo demo;

    public SystemController(ResourceCleaner resourceCleaner, Config config, Demo demo) {
        this.resourceCleaner = resourceCleaner;
        this.config = config;
        this.demo = demo;
    }

    @GetMapping("/cron/cleanup")
    public ResponseEntity<Map<String, Object>> cronCleanup(@Parameter(hidden = true) User user) {
        LOG.debug(String.format("/cron/cleanup for user %s", user.getEmail()));
        confirmSuperUser(user);
        Map<String, Object> body = resourceCleaner.doClean();
        return ResponseEntity.ok(body);
    }

    @PostMapping("/seed/demo")
    public ResponseEntity<Map<String, Object>> demoSeed(@Parameter(hidden = true) User user) {
        LOG.debug(String.format("/seed/demo for user %s", user.getEmail()));
        confirmSuperUser(user);
        if (!config.isDemoSeedEnabled()) {
            throw new NotAllowedException("Demo seed is not enabled");
        }
        Map<String, Object> result = demo.seed();
        return ResponseEntity.ok(result);
    }

}
