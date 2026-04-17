package access.stats;

import access.remote.RestTemplateFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
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
        UriComponentsBuilder builder = baseBuilder("/public/login_time_frame", idpEntityId)
                .queryParam("from", from)
                .queryParam("to", to)
                .queryParam("scale", scale)
                .queryParam("epoch", "ms");
        if (StringUtils.hasText(spEntityId)) {
            builder.queryParam("sp_id", spEntityId);
        }
        URI uri = builder.build().encode().toUri();
        return restTemplate.getForEntity(uri, List.class).getBody();
    }

    public List<Object> loginAggregated(String period, String idpEntityId, String spEntityId, String groupBy) {
        UriComponentsBuilder builder = baseBuilder("/public/login_aggregated", idpEntityId)
                .queryParam("period", period)
                .queryParam("group_by", groupBy);
        if (StringUtils.hasText(spEntityId)) {
            builder.queryParam("sp_id", spEntityId);
        }
        URI uri = builder.build().encode().toUri();
        return restTemplate.getForEntity(uri, List.class).getBody();
    }

    public List<Object> uniqueLoginCount(long from, long to, String idpEntityId, String spEntityId) {
        UriComponentsBuilder builder = baseBuilder("/public/unique_login_count", idpEntityId)
                .queryParam("from", from)
                .queryParam("to", to)
                .queryParam("epoch", "ms")
                .queryParam("sp_id", spEntityId);
        URI uri = builder.build().encode().toUri();
        return restTemplate.getForEntity(uri, List.class).getBody();
    }

    private UriComponentsBuilder baseBuilder(String path, String idpEntityId) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(baseUrl)
                .path(path)
                .queryParam("include_unique", true);
        if (StringUtils.hasText(idpEntityId)) {
            builder.queryParam("idp_id", idpEntityId);
        }
        return builder;
    }

}
