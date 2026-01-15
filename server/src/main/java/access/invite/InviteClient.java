package access.invite;

import access.remote.RestTemplateFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class InviteClient {

    private final boolean enabled;
    private final String url;
    private final RestTemplate restTemplate;

    public InviteClient(@Value("${invite.enabled}") boolean enabled,
                        @Value("${invite.url}") String url,
                        @Value("${invite.user}") String user,
                        @Value("${invite.password}") String password) {
        this.enabled = enabled;
        this.url = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        this.restTemplate = RestTemplateFactory.buildRestTemplate(user, password);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> rolesPerOrganizationApplicationId(String organizationGUID,
                                                                       String applicationManageId) {
        if (!enabled) {
            return List.of();
        }
        return restTemplate.getForObject(
                url + "/api/external/v1/internal/invite/roles/{organizationGUID}/{applicationManageId}",
                List.class,
                organizationGUID,
                applicationManageId);
    }
}
