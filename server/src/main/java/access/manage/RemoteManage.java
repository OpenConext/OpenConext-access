package access.manage;

import access.model.Connection;
import access.model.EntityType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.support.BasicAuthenticationInterceptor;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static java.util.Collections.emptyList;

@SuppressWarnings("unchecked")
public class RemoteManage implements Manage {

    private static final Log LOG = LogFactory.getLog(RemoteManage.class);

    private final String url;
    //Because of the custom error handling, we need to use Buffering
    private final RestTemplate restTemplate = new RestTemplate(
            new BufferingClientHttpRequestFactory(new SimpleClientHttpRequestFactory())
    );
    private final Map<String, Object> queries;
    private final ConnectionProviderConverter converter;
    private final ObjectMapper objectMapper;

    public RemoteManage(String url, String user, String password, ConnectionProviderConverter converter, ObjectMapper objectMapper) throws IOException {
        this.url = url;
        this.objectMapper = objectMapper;
        this.converter = converter;
        this.queries = objectMapper.readValue(new ClassPathResource("/manage/query_templates.json").getInputStream(), new TypeReference<>() {
        });
        List<ClientHttpRequestInterceptor> interceptors = restTemplate.getInterceptors();
        interceptors.add(new BasicAuthenticationInterceptor(user, password));
        interceptors.add(new JSONHeaderInterceptor());
        ResponseErrorHandler resilientErrorHandler = new ResilientErrorHandler(objectMapper);
        restTemplate.setErrorHandler(resilientErrorHandler);
    }

    @Override
    public List<Map<String, Object>> providers(EntityType... entityTypes) {
        LOG.debug("Providers for entityTypes: " + List.of(entityTypes));
        return Stream.of(entityTypes).map(entityType -> this.getRemoteMetaData(entityType.collectionName(), false))
                .flatMap(List::stream)
                .toList();
    }

    @Override
    public Map<String, Object> providerById(EntityType entityType, String id) {
        LOG.debug("providerById: " + entityType);
        String queryUrl = String.format("%s/manage/api/internal/metadata/%s/%s", url, entityType.collectionName(), id);
        return restTemplate.getForEntity(queryUrl, Map.class).getBody();
    }

    @Override
    public List<Map<String, Object>> providersByIdIn(EntityType entityType, List<String> identifiers) {
        LOG.debug("providersByIdIn: " + entityType);
        if (CollectionUtils.isEmpty(identifiers)) {
            return emptyList();
        }
        String param = identifiers.stream().map(id -> String.format("\"%s\"", id)).collect(Collectors.joining(","));
        String body = String.format("{ \"id\": { \"$in\": [%s]}}", param);
        String manageUrl = String.format("%s/manage/api/internal/rawSearch/%s", url, entityType.collectionName());
        return restTemplate.postForObject(manageUrl, body, List.class);
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        String provider = converter.convert(connection);
        ResponseEntity<Map> responseEntity;
        if (StringUtils.hasText(connection.getManageIdentifier())) {
            responseEntity = this.restTemplate.exchange(String.format("%s/manage/api/internal/metadata", this.url),
                    HttpMethod.PUT, new HttpEntity<>(provider), Map.class);
        } else {
            responseEntity = this.restTemplate.postForEntity(String.format("%s/manage/api/internal/metadata", this.url), provider, Map.class);
        }
        Map body = responseEntity.getBody();
        if (ResilientErrorHandler.ignoreError(body)) {
            //See ResilientErrorHandler#handleError. Any no-data-changed error is already thrown
            return objectMapper.readValue(provider, new TypeReference<>() {
            });
        }
        return body;
    }

    @Override
    public void deleteProvider(Connection connection) {
        this.restTemplate.delete(String.format("%s/manage/api/internal/metadata/{type}/{id}", this.url),
                connection.getProtocol(),
                connection.getManageIdentifier());
    }

    private List<Map<String, Object>> getRemoteMetaData(String type, boolean allAttributes) {
        Map<String, Object> baseQuery = getBaseQuery(allAttributes);
        String url = String.format("%s/manage/api/internal/search/%s", this.url, type);
        return restTemplate.postForObject(url, baseQuery, List.class);
    }

    private Map<String, Object> getBaseQuery(boolean allAttributes) {
        HashMap<String, Object> baseQuery = new HashMap<>((Map<String, Object>) this.queries.get("base_query"));
        if (!allAttributes) {
            baseQuery.put("REQUESTED_ATTRIBUTES", baseQuery.get("REQUESTED_ATTRIBUTES"));
        } else {
            baseQuery.remove("REQUESTED_ATTRIBUTES");
            baseQuery.put("ALL_ATTRIBUTES", true);
        }
        return baseQuery;
    }


}
