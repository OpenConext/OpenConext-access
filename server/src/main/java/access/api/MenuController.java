package access.api;

import access.exception.NotFoundException;
import access.menu.MenuResponse;
import access.menu.MenuService;
import access.model.User;
import access.repository.UserRepository;
import io.swagger.v3.oas.annotations.Parameter;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The menu model of the SURF Access shell. The Access client uses the session based endpoint, the Invite server
 * (running on a different domain) uses the endpoint with basic authentication for the user it has authenticated.
 */
@RestController
@Transactional(readOnly = true)
public class MenuController {

    private static final Log LOG = LogFactory.getLog(MenuController.class);

    private final MenuService menuService;
    private final UserRepository userRepository;

    @Autowired
    public MenuController(MenuService menuService, UserRepository userRepository) {
        this.menuService = menuService;
        this.userRepository = userRepository;
    }

    @GetMapping(value = "/api/v1/menu", produces = MediaType.APPLICATION_JSON_VALUE)
    public MenuResponse menu(@Parameter(hidden = true) User user,
                             @RequestParam(value = "organizationId", required = false) String organizationId) {
        LOG.debug("/api/v1/menu for user " + user.getSub());
        User userFromDB = userRepository.findDetailsById(user.getId())
            .orElseThrow(() -> new NotFoundException("User not found"));
        return menuService.menu(userFromDB, organizationId);
    }

    @GetMapping(value = "/api/external/v1/menu", produces = MediaType.APPLICATION_JSON_VALUE)
    public MenuResponse externalMenu(@RequestParam("sub") String sub,
                                     @RequestParam(value = "organizationId", required = false) String organizationId,
                                     Authentication authentication) {
        LOG.info(String.format("External menu request for %s by %s", sub, authentication.getPrincipal()));
        User user = userRepository.findBySubIgnoreCase(sub)
            .orElseThrow(() -> new NotFoundException("User not found"));
        return menuService.menu(user, organizationId);
    }
}
