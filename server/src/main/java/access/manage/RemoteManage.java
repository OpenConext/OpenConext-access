package access.manage;

import access.exception.NotFoundException;
import access.model.*;
import access.remote.RestTemplateFactory;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@SuppressWarnings("unchecked")
public class RemoteManage implements Manage {

    private static final Log LOG = LogFactory.getLog(RemoteManage.class);

    //Because of the custom error handling, we need to use Buffering
    private final Map<Environment, RestTemplate> restTemplates;
    private final Map<String, Object> queries;
    private final ConnectionProviderConverter converter;
    private final ManageAuthorization testAuthorization;
    private final ManageAuthorization productionAuthorization;
    private final Environment activeEnvironment;

    public RemoteManage(ManageAuthorization testAuthorization,
                        ManageAuthorization productionAuthorization,
                        ConnectionProviderConverter converter,
                        Environment activeEnvironment,
                        ObjectMapper objectMapper) throws IOException {
        this.testAuthorization = testAuthorization;
        this.productionAuthorization = productionAuthorization;
        this.converter = converter;
        this.activeEnvironment = activeEnvironment;
        this.queries = objectMapper.readValue(new ClassPathResource("/manage/query_templates.json").getInputStream(), new TypeReference<>() {
        });
        ResponseErrorHandler resilientErrorHandler = new ResilientErrorHandler(objectMapper);
        this.restTemplates = Map.of(
                Environment.TEST, RestTemplateFactory.buildRestTemplate(resilientErrorHandler, testAuthorization.user(), testAuthorization.password()),
                Environment.PROD, RestTemplateFactory.buildRestTemplate(resilientErrorHandler, productionAuthorization.user(), productionAuthorization.password())
        );
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

        return providerDetails(environment, protocol, manageIdentifier);
    }

    private Map<String, Object> providerDetails(Environment environment, EntityType protocol, String manageIdentifier) {
        String url = environmentUrl(environment);
        String queryUrl = String.format("%s/manage/api/internal/metadata/%s/%s", url, protocol.name(), manageIdentifier);
        RestTemplate restTemplate = environmentRestTemplate(environment);
        ResponseEntity<Map> responseEntity = restTemplate.getForEntity(queryUrl, Map.class);
        if (responseEntity.getStatusCode().equals(HttpStatus.OK)) {
            return sanitizeProvider(responseEntity.getBody());
        }
        return responseEntity.getBody();
    }

    public Map<String, Object> providerById(EntityType entityType, String manageIdentifier, Environment environment) {
        LOG.debug("providerById: " + entityType);

        return providerDetails(environment, entityType, manageIdentifier);
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveIdentityProvider(Organization organization) {
        Map<String, Object> provider = providerById(EntityType.saml20_idp, organization.getManageIdentifier(), Environment.PROD);
        Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));

        Map<String, Object> metaDataOrganization = organization.getMetaData();
        converter.convertContactPersons(metaDataOrganization, metaDataFields);
        String keyWords = String.join(" ", ((List<String>) metaDataOrganization.getOrDefault("keyWords", List.of())));
        metaDataFields.put("keywords:0:nl", keyWords);
        metaDataFields.put("keywords:0:en", keyWords);

        RestTemplate restTemplate = environmentRestTemplate(Environment.PROD);
        String url = environmentUrl(Environment.PROD);
        ResponseEntity<Map> responseEntity = restTemplate.exchange(String.format("%s/manage/api/internal/metadata", url),
                HttpMethod.PUT, new HttpEntity<>(provider), Map.class);
        Map body = responseEntity.getBody();
        if (ResilientErrorHandler.ignoreError(body)) {
            //See ResilientErrorHandler#handleError. Any no-data-changed error is thrown there
            return provider;
        }
        return body;
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        Map<String, Object> remoteProvider = StringUtils.hasText(connection.getManageIdentifier()) ?
                providerById(connection) :
                baseStructureProvider();
        //We must ensure that no data is overridden that was altered in Manage. Especially additional metadata and
        //Attribute Release Policies that are not available in Access
        //We can't update everything if the connection is production ready, only the application data
        Map<String, Object> provider = converter.convert(connection, remoteProvider, connection.changeRequestRequired());
        RestTemplate restTemplate = environmentRestTemplate(connection.getEnvironment());
        String url = environmentUrl(connection.getEnvironment());
        HttpMethod httpMethod = StringUtils.hasText(connection.getManageIdentifier()) ? HttpMethod.PUT : HttpMethod.POST;
        ResponseEntity<Map> responseEntity = restTemplate.exchange(String.format("%s/manage/api/internal/metadata", url),
                httpMethod, new HttpEntity<>(provider), Map.class);
        Map body = responseEntity.getBody();
        if (ResilientErrorHandler.ignoreError(body)) {
            //See ResilientErrorHandler#handleError. Any no-data-changed error is thrown there
            return provider;
        }
        return body;
    }

    @Override
    public void deleteProvider(Connection connection) {
        Environment environment = connection.getEnvironment();
        RestTemplate restTemplate = environmentRestTemplate(environment);
        String url = String.format("%s/manage/api/internal/metadata/%s/%s",
                environmentUrl(environment),
                connection.getProtocol(),
                connection.getManageIdentifier());
        restTemplate.exchange(URI.create(url), HttpMethod.DELETE, null, Void.class);
    }

    @Override
    public void rejectChangeRequest(Environment environment, ChangeRequest changeRequest) {
        RestTemplate restTemplate = environmentRestTemplate(environment);
        String url = String.format("%s/manage/api/internal/change-requests/reject",
                environmentUrl(environment));
        restTemplate.put(URI.create(url), changeRequest);
    }

    @Override
    public List<Map<String, Object>> uniqueEntityId(Environment environment, EntityType entityType, String entityID) {
        RestTemplate restTemplate = environmentRestTemplate(environment);
        String url = environmentUrl(environment);
        String queryUrl = String.format("%s/manage/api/internal/uniqueEntityId/%s", url, entityType.name());
        return restTemplate.postForEntity(queryUrl, Map.of("entityid", entityID), List.class).getBody();
    }

    @Override
    public Map<String, Object> createChangeRequest(Environment environment, ChangeRequest changeRequest) {
        RestTemplate restTemplate = environmentRestTemplate(environment);
        String url = String.format("%s/manage/api/internal/change-requests", environmentUrl(environment));
        HttpEntity<ChangeRequest> requestEntity = new HttpEntity<>(changeRequest);
        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(url, HttpMethod.POST, requestEntity,
                new ParameterizedTypeReference<>() {
                });
        return responseEntity.getBody();
    }

    @Override
    public List<Map<String, Object>> getChangeRequests(Environment environment, Connection connection) {
        RestTemplate restTemplate = environmentRestTemplate(environment);
        String url = String.format("%s/manage/api/internal/change-requests/%s/%s",
                environmentUrl(environment),
                connection.getProtocol().name(),
                connection.getManageIdentifier());
        return restTemplate.getForEntity(url, List.class).getBody();
    }

    @Override
    public List<Map<String, Object>> getChangeRequestsIdentityProvider(Map<String, Object> identityProvider) {
        RestTemplate restTemplate = environmentRestTemplate(activeEnvironment);
        String url = String.format("%s/manage/api/internal/change-requests/%s/%s",
                environmentUrl(activeEnvironment),
                EntityType.saml20_idp.name(),
                identityProvider.get("id"));
        return restTemplate.getForEntity(url, List.class).getBody();
    }

    @Override
    public String changeRequestURL(Environment environment, Connection connection) {
        String url = this.environmentUrl(environment);
        return String.format("%s/metadata/%s/%s/requests",
                url, connection.getProtocol().name(), connection.getManageIdentifier());
    }

    @Override
    public String changeRequestURLConnectionRequest(EntityType entityType, String manageIdentifier) {
        String url = this.environmentUrl(Environment.PROD);
        return String.format("%s/metadata/%s/%s/requests",
                url, entityType.name(), manageIdentifier);
    }

    /**
     * Equivalent of
     * curl -H 'Content-Type: application/json' -u user:password  -X POST -d \
     * '{"entityid":"http://mock-idp","ALL_ATTRIBUTES":true}' \
     * 'https://manage.test.surfconext.nl/manage/api/internal/search/saml20_idp' | jq .
     */
    @Override
    public Map<String, Object> identityProviderByEntityID(String entityID) {
        LOG.debug("identityProvidersByEntityID for : " + entityID);
        Map<String, Object> baseQuery = getBaseQuery(true);
        baseQuery.put("entityid", entityID);

        String url = String.format("%s/manage/api/internal/search/%s",
                environmentUrl(activeEnvironment),
                EntityType.saml20_idp.name());
        List<Map<String, Object>> identityProviders = environmentRestTemplate(activeEnvironment).postForObject(
                url,
                baseQuery, List.class);
        if (identityProviders.isEmpty()) {
            throw new NotFoundException("No identityProviders found for entityID: " + entityID);
        }
        return sanitizeProvider(identityProviders.getFirst());
    }

    @Override
    public List<Map<String, Object>> serviceProvidersByEntityID(List<String> entityIdentifiers) {
        LOG.debug("serviceProvidersByEntityID for : " + entityIdentifiers);

        Map<String, Object> baseQuery = getBaseQuery(true);
        baseQuery.put("entityid", entityIdentifiers);
        return Stream.of(EntityType.oidc10_rp, EntityType.saml20_sp)
                .flatMap(entityType -> {
                    String url = String.format("%s/manage/api/internal/search/%s",
                            environmentUrl(activeEnvironment),
                            entityType.name());
                    List<Map<String, Object>> identityProviders = environmentRestTemplate(activeEnvironment).postForObject(
                            url,
                            baseQuery, List.class);
                    return identityProviders.stream();
                }).toList();
    }

    @Override
    public List<Map<String, Object>> identityProvidersByInstitutionalGUID(Environment environment, String organisationGUID) {
        LOG.debug("identityProviderByInstitutionalGUID for : " + organisationGUID);

        Map<String, Object> baseQuery = getBaseQuery(false);
        baseQuery.put("metaDataFields.coin:institution_guid", organisationGUID);

        String url = String.format("%s/manage/api/internal/search/%s",
                environmentUrl(environment),
                EntityType.saml20_idp.name());
        return environmentRestTemplate(environment).postForObject(
                url,
                baseQuery, List.class);
    }

    @Override
    public List<Map<String, Object>> identityProvidersLight(Environment environment) {
        LOG.debug("identityProvidersLight for environment: " + environment);

        Map<String, Object> baseQuery = getBaseQuery(false);
        ((List) baseQuery.get("REQUESTED_ATTRIBUTES")).add("metaDataFields.coin:institution_type");

        String url = String.format("%s/manage/api/internal/search/%s",
                environmentUrl(environment),
                EntityType.saml20_idp.name());
        return environmentRestTemplate(environment).postForObject(
                url,
                baseQuery, List.class);
    }

    @Override
    public List<Map<String, Object>> serviceProvidersLight(Environment environment) {
        LOG.debug("serviceProvidersLight for environment: " + environment);

        Map<String, Object> baseQuery = getBaseQuery(false);
        List requestedAttributes = (List) baseQuery.get("REQUESTED_ATTRIBUTES");
        requestedAttributes.add("metaDataFields.coin:interfed_source");
        requestedAttributes.add("metaDataFields.application_tags");

        String url = String.format("%s/manage/api/internal/search/%s",
                environmentUrl(environment),
                EntityType.saml20_sp.name());
        List<Map<String, Object>> serviceProviders = environmentRestTemplate(environment).postForObject(
                url,
                baseQuery,
                List.class);
        url = String.format("%s/manage/api/internal/search/%s",
                environmentUrl(environment),
                EntityType.oidc10_rp.name());
        List<Map<String, Object>> relyingParties = environmentRestTemplate(environment).postForObject(
                url,
                baseQuery,
                List.class);
        serviceProviders.addAll(relyingParties);
        return serviceProviders;
    }

    @Override
    public Map<String, Integer> stats() {
        LOG.debug("stats");

        String url = String.format("%s/manage/api/internal/stats",
                environmentUrl(Environment.PROD),
                EntityType.saml20_idp.name());
        return environmentRestTemplate(Environment.PROD)
                .getForEntity(url, Map.class).getBody();
    }

    @Override
    public List<Map<String, Object>> identityProvidersByAllowedConnections(List<Connection> connections) {
        List<Map<String, String>> body = connections.stream()
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()) &&
                        connection.getEnvironment().equals(Environment.PROD) &&
                        connection.getState().equals(State.prodaccepted))
                .map(connection -> Map.of(
                        "id", connection.getManageIdentifier(),
                        "type", connection.getProtocol().name()))
                .toList();
        if (body.isEmpty()) {
            //No use to actually go to Manage
            return List.of();
        }
        RestTemplate restTemplate = environmentRestTemplate(Environment.PROD);
        String url = String.format("%s/manage/api/internal/delete-consequences",
                environmentUrl(Environment.PROD));
        return restTemplate.postForEntity(URI.create(url), body, List.class).getBody();
    }

    @Override
    public void connectWithoutInteraction(Map<String, Object> identityProvider, Map<String, Object> serviceProvider, User user) {
        RestTemplate restTemplate = environmentRestTemplate(Environment.PROD);
        String url = String.format("%s/manage/api/internal/connectWithoutInteraction",
                environmentUrl(Environment.PROD));
        Map<String, String> bodyMap = new HashMap<>();
        bodyMap.put("idpId", (String) getData(identityProvider).get("entityid"));
        bodyMap.put("spId", (String) getData(serviceProvider).get("entityid"));
        bodyMap.put("spType", (String) serviceProvider.get("type"));
        bodyMap.put("user", user.getName());
        bodyMap.put("userUrn", user.getSub());
        //Fire and forget. An exception will be thrown by the restTemplate if the return is not 20X
        restTemplate.put(url, bodyMap);
    }

    private List<Map<String, Object>> getRemoteMetaData(Environment environment, String type, boolean allAttributes) {
        Map<String, Object> baseQuery = getBaseQuery(allAttributes);
        String url = String.format("%s/manage/api/internal/search/%s", environmentUrl(environment), type);
        return environmentRestTemplate(environment).postForObject(url, baseQuery, List.class);
    }

    private Map<String, Object> getBaseQuery(boolean allAttributes) {
        HashMap<String, Object> baseQuery = new HashMap<>((Map<String, Object>) this.queries.get("base_query"));
        if (allAttributes) {
            baseQuery.remove("REQUESTED_ATTRIBUTES");
            baseQuery.put("ALL_ATTRIBUTES", true);
        } else {
            baseQuery.put("REQUESTED_ATTRIBUTES", baseQuery.get("REQUESTED_ATTRIBUTES"));
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
