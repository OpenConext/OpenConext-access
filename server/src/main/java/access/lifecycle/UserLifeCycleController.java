package access.lifecycle;


import access.model.User;
import access.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;


@RestController
@RequestMapping(value = {"/api/external/v1/deprovision"}, produces = MediaType.APPLICATION_JSON_VALUE)
public class UserLifeCycleController {

    private static final Logger LOG = LoggerFactory.getLogger(UserLifeCycleController.class);

    private final UserRepository userRepository;

    @Autowired
    public UserLifeCycleController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @RequestMapping(method = RequestMethod.GET, value = "/{userId:.+}")
    public LifeCycleResult preview(@PathVariable String userId, Authentication authentication) {
        LOG.info("Request for lifecycle preview for {} by {}", userId, authentication.getPrincipal());

        return doDryRun(userId, true);
    }

    @RequestMapping(method = RequestMethod.DELETE, value = "/{userId:.+}/dry-run")
    public LifeCycleResult dryRun(@PathVariable String userId, Authentication authentication) {
        LOG.info("Request for lifecycle dry-run for {} by {}", userId, authentication.getPrincipal());

        return doDryRun(userId, true);
    }

    @RequestMapping(method = RequestMethod.DELETE, value = "/{userId:.+}")
    @Transactional
    public LifeCycleResult deprovision(@PathVariable String userId, Authentication authentication) {
        LOG.info("Request for lifecycle deprovision for {} by {}", userId, authentication.getPrincipal());

        return doDryRun(userId, false);
    }

    private LifeCycleResult doDryRun(String userId, boolean dryRun) {
        LifeCycleResult result = new LifeCycleResult();
        Optional<User> optionalUser = this.userRepository.findBySubIgnoreCase(userId);
        if (optionalUser.isEmpty()) {
            return result;
        }
        User user = optionalUser.get();
        List<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("email", user.getEmail()));
        attributes.add(new Attribute("eduPersonPrincipalName", user.getEduPersonPrincipalName()));
        attributes.add(new Attribute("schacHomeOrganization", user.getSchacHomeOrganization()));
        attributes.add(new Attribute("name", user.getName()));
        attributes.add(new Attribute("urn", user.getSub()));
        attributes.add(new Attribute("lastLoginDate", user.getLastActivity().toString()));
        if (!dryRun) {
            userRepository.delete(user);
        }
        result.setData(attributes.stream()
                .filter(attr -> StringUtils.hasText(attr.getValue()))
                .sorted(Comparator.comparing(Attribute::getName))
                .toList());
        return result;
    }

}
