package access.manage;

import access.model.Connection;
import access.model.EntityType;
import access.model.Environment;
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
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@SuppressWarnings("unchecked")
public class RemoteManage implements Manage {

    private static final Log LOG = LogFactory.getLog(RemoteManage.class);

    //Because of the custom error handling, we need to use Buffering
    private final Map<Environment, RestTemplate> restTemplates = Map.of(
            Environment.TEST, new RestTemplate(
                    new BufferingClientHttpRequestFactory(new SimpleClientHttpRequestFactory())
            ),
            Environment.PROD, new RestTemplate(
                    new BufferingClientHttpRequestFactory(new SimpleClientHttpRequestFactory())
            )

    );
    private final Map<String, Object> queries;
    private final ConnectionProviderConverter converter;
    private final ObjectMapper objectMapper;
    private final ManageAuthorization testAuthorization;
    private final ManageAuthorization productionAuthorization;

    public RemoteManage(ManageAuthorization testAuthorization, ManageAuthorization productionAuthorization, ConnectionProviderConverter converter, ObjectMapper objectMapper) throws IOException {
        this.testAuthorization = testAuthorization;
        this.productionAuthorization = productionAuthorization;
        this.objectMapper = objectMapper;
        this.converter = converter;
        this.queries = objectMapper.readValue(new ClassPathResource("/manage/query_templates.json").getInputStream(), new TypeReference<>() {
        });
        ResponseErrorHandler resilientErrorHandler = new ResilientErrorHandler(objectMapper);
        restTemplates.forEach((environment, restTemplate) -> {
            List<ClientHttpRequestInterceptor> interceptors = restTemplate.getInterceptors();
            ManageAuthorization authorization = environment.equals(Environment.TEST) ? testAuthorization : productionAuthorization;
            interceptors.add(new BasicAuthenticationInterceptor(authorization.user(), authorization.password()));
            interceptors.add(new JSONHeaderInterceptor());
            restTemplate.setErrorHandler(resilientErrorHandler);

        });
    }

    @Override
    public List<Map<String, Object>> providers(Environment environment, EntityType... entityTypes) {
        LOG.debug("Providers for entityTypes: " + List.of(entityTypes));
        return Stream.of(entityTypes).map(entityType -> this.getRemoteMetaData(environment, entityType.name(), false))
                .flatMap(List::stream)
                .toList();
    }

    @Override
    public Map<String, Object> providerById(Connection connection) {
        String manageIdentifier = connection.getManageIdentifier();
        EntityType protocol = connection.getProtocol();
        Environment environment = connection.getEnvironment();

        LOG.debug("providerById: " + protocol);

        String url = environmentUrl(environment);
        String queryUrl = String.format("%s/manage/api/internal/metadata/%s/%s", url, protocol.name(), manageIdentifier);
        RestTemplate restTemplate = environmentRestTemplate(environment);
        return restTemplate.getForEntity(queryUrl, Map.class).getBody();
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        String provider = converter.convert(connection);
        ResponseEntity<Map> responseEntity;
        RestTemplate restTemplate = environmentRestTemplate(connection.getEnvironment());
        String url = environmentUrl(connection.getEnvironment());
        if (StringUtils.hasText(connection.getManageIdentifier())) {
            responseEntity = restTemplate.exchange(String.format("%s/manage/api/internal/metadata", url),
                    HttpMethod.PUT, new HttpEntity<>(provider), Map.class);
        } else {
            responseEntity = restTemplate.postForEntity(String.format("%s/manage/api/internal/metadata", url), provider, Map.class);
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
        Environment environment = connection.getEnvironment();
        RestTemplate restTemplate = environmentRestTemplate(environment);
        restTemplate.delete(String.format("%s/manage/api/internal/metadata/{type}/{id}", environmentUrl(environment)),
                connection.getProtocol(),
                connection.getManageIdentifier());
    }

    @Override
    public List<Map<String, Object>> providersByEntityID(Environment environment,  EntityType entityType, String entityID) {
        RestTemplate restTemplate = environmentRestTemplate(environment);
        String url = environmentUrl(environment);
        String queryUrl = String.format("%s/manage/api/internal/uniqueEntityId/%s", url, entityType.name());
        return restTemplate.postForEntity(queryUrl, Map.of("entityid", entityID),List.class).getBody();
    }

    private List<Map<String, Object>> getRemoteMetaData(Environment environment, String type, boolean allAttributes) {
        Map<String, Object> baseQuery = getBaseQuery(allAttributes);
        String url = String.format("%s/manage/api/internal/search/%s", environmentUrl(environment), type);
        return environmentRestTemplate(environment).postForObject(url, baseQuery, List.class);
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

    private String environmentUrl(Environment environment) {
        return environment.equals(Environment.TEST) ? this.testAuthorization.url() : this.productionAuthorization.url();
    }

    private RestTemplate environmentRestTemplate(Environment environment) {
        return restTemplates.get(environment);
    }
}
