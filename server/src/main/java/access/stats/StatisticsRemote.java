package access.stats;

import access.remote.RestTemplateFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.util.List;

@SuppressWarnings("unchecked")
@Component
@ConditionalOnProperty(
        prefix = "statistics",
        name = "enabled",
        havingValue = "true"
)
public class StatisticsRemote implements Statistics {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    @Autowired
    public StatisticsRemote(@Value("${statistics.user}") String user,
                            @Value("${statistics.password}") String password,
                            @Value("${statistics.url}") String baseUrl) {
        this.restTemplate = RestTemplateFactory.buildRestTemplate(user, password);
        this.baseUrl = baseUrl;
    }

    public List<Object> loginTimeFrame(long from, long to, String scale, String idpEntityId, String spEntityId) {
        String idp = encodeEntityID(idpEntityId);
        StringBuilder url = new StringBuilder(String.format(
                "%s/public/login_time_frame?from=%s&to=%s&include_unique=true&scale=%s&epoch=ms&idp_id=%s",
                baseUrl, from, to, scale, idp));
        if (StringUtils.hasText(spEntityId)) {
            url.append(String.format("&sp_id=%s", encodeEntityID(spEntityId)));
        }
        return restTemplate.getForEntity(url.toString(), List.class).getBody();
    }

    private String encodeEntityID(String entityID) {
        return URLEncoder.encode(entityID, Charset.defaultCharset());
    }

    public List<Object> loginAggregated(String period, String idpEntityId, String spEntityId) {
        StringBuilder url = new StringBuilder(String.format(
                "%s/public/login_aggregated?period=%s&include_unique=true&idp_id=%s&group_by=sp_id",
                baseUrl, period, encodeEntityID(idpEntityId)));
        if (StringUtils.hasText(spEntityId)) {
            url.append(String.format("&sp_id=%s", encodeEntityID(spEntityId)));
        }
        return restTemplate.getForEntity(url.toString(), List.class).getBody();
    }

    public List<Object> uniqueLoginCount(long from, long to, String idpEntityId, String spEntityId) {
        String url = String.format(
                "%s/public/unique_login_count?from=%s&to=%s&include_unique=true&epoch=ms&idp_id=%s&sp_id=%s",
                baseUrl, from, to, encodeEntityID(idpEntityId), encodeEntityID(spEntityId));
        return restTemplate.getForEntity(url, List.class).getBody();
    }

}

