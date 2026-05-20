package access.manage;

import access.exception.NotFoundException;
import access.exception.UserRestrictionException;
import access.model.Connection;
import access.model.EntityType;
import access.model.Organization;
import access.model.State;
import access.model.User;
import access.remote.RestTemplateFactory;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@SuppressWarnings("unchecked")
public class RemoteManage implements Manage {

    private static final Log LOG = LogFactory.getLog(RemoteManage.class);
    private static final ParameterizedTypeReference<Map<String, Object>> PARAMETERIZED_TYPE_REFERENCE = new ParameterizedTypeReference<>() {
    };

    private final RestTemplate restTemplate;
    private final String url;
    private final Map<String, Object> queries;
    private final ConnectionProviderConverter converter;

    public RemoteManage(ManageAuthorization authorization,
                        ConnectionProviderConverter converter,
                        ObjectMapper objectMapper) throws IOException {
        this.url = authorization.url();
        this.converter = converter;
        this.queries = objectMapper.readValue(new ClassPathResource("/manage/query_templates.json").getInputStream(), new TypeReference<>() {
        });
        ResponseErrorHandler resilientErrorHandler = new ResilientErrorHandler(objectMapper);
        this.restTemplate = RestTemplateFactory.buildRestTemplate(resilientErrorHandler, authorization.user(), authorization.password(), null);
    }

    @Override
    public List<Map<String, Object>> providers(EntityType... entityTypes) {
        LOG.debug("Providers for entityTypes: " + List.of(entityTypes));
        return Stream.of(entityTypes).map(entityType -> this.getRemoteMetaData(entityType.name(), false))
                .flatMap(List::stream)
                .toList();
    }

    @Override
    public Map<String, Object> providerByConnection(Connection connection) {
        String manageIdentifier = connection.getManageIdentifier();
        EntityType protocol = connection.getProtocol();

        LOG.debug("providerById: " + protocol);

        return providerDetails(protocol, manageIdentifier);
    }

    private Map<String, Object> providerDetails(EntityType protocol, String manageIdentifier) {
        String queryUrl = String.format("%s/manage/api/internal/metadata/%s/%s", url, protocol.name(), manageIdentifier);
        ResponseEntity<Map> responseEntity = restTemplate.getForEntity(queryUrl, Map.class);
        if (responseEntity.getStatusCode().equals(HttpStatus.OK)) {
            return sanitizeProvider(responseEntity.getBody());
        }
        return responseEntity.getBody();
    }

    public Map<String, Object> providerByManageIdentifier(EntityType entityType, String manageIdentifier) {
        LOG.debug("providerById: " + entityType);

        return providerDetails(entityType, manageIdentifier);
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveIdentityProvider(Organization organization) {
        Map<String, Object> provider = providerByManageIdentifier(EntityType.saml20_idp, organization.getManageIdentifier());
        Map<String, Object> metaDataFields = getMetaDataFields(getData(provider));
        Map<String, Object> metaDataOrganization = organization.getMetaData();
        converter.convertContactPersons(metaDataOrganization, metaDataFields);
        String keyWords = String.join(" ", ((List<String>) metaDataOrganization.getOrDefault("keyWords", List.of())));
        metaDataFields.put("keywords:0:nl", keyWords);
        metaDataFields.put("keywords:0:en", keyWords);

        return internalSaveProvider(provider);
    }

    @Override
    public Map<String, Object>  saveIdentityProvider(Map<String, Object> identityProvider) {
        return internalSaveProvider(identityProvider);
    }

    @SneakyThrows
    @Override
    public Map<String, Object> saveProvider(Connection connection) {
        Map<String, Object> remoteProvider = StringUtils.hasText(connection.getManageIdentifier()) ?
                providerByConnection(connection) :
                baseStructureProvider();
        //We must ensure that no data is overridden that was altered in Manage. Especially additional metadata and
        //Attribute Release Policies that are not available in Access
        //We can't update everything if the connection is production ready, only the application data
        Map<String, Object> provider = converter.convert(connection, remoteProvider, connection.changeRequestRequired());
        HttpMethod httpMethod = StringUtils.hasText(connection.getManageIdentifier()) ? HttpMethod.PUT : HttpMethod.POST;
        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(String.format("%s/manage/api/internal/metadata", url),
                httpMethod, new HttpEntity<>(provider), PARAMETERIZED_TYPE_REFERENCE);
        return checkNoChangeResponse(responseEntity, provider);
    }

    @Override
    public Map<String, Object> updateProvider(Map<String, Object> provider) {
        return internalSaveProvider(provider);
    }

    private Map<String, Object> internalSaveProvider(Map<String, Object> provider) {
        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(String.format("%s/manage/api/internal/metadata", url),
                HttpMethod.PUT, new HttpEntity<>(provider), PARAMETERIZED_TYPE_REFERENCE);
        return checkNoChangeResponse(responseEntity, provider);
    }

    @Override
    public void deleteProvider(Connection connection) {
        String deleteUrl = String.format("%s/manage/api/internal/metadata/%s/%s",
                url,
                connection.getProtocol(),
                connection.getManageIdentifier());
        restTemplate.exchange(URI.create(deleteUrl), HttpMethod.DELETE, null, Void.class);
    }

    @Override
    public void rejectChangeRequest(ChangeRequest changeRequest) {
        String rejectUrl = String.format("%s/manage/api/internal/change-requests/reject", url);
        restTemplate.put(URI.create(rejectUrl), changeRequest);
    }

    @Override
    public List<Map<String, Object>> uniqueEntityId(EntityType entityType, String entityID) {
        String queryUrl = String.format("%s/manage/api/internal/uniqueEntityId/%s", url, entityType.name());
        return restTemplate.postForEntity(queryUrl, Map.of("entityid", entityID), List.class).getBody();
    }

    @Override
    public Map<String, Object> createChangeRequest(ChangeRequest changeRequest) {
        return doSaveChangeRequest(changeRequest, HttpMethod.POST);
    }

    @Override
    public Map<String, Object> updateChangeRequest(ChangeRequest changeRequest) {
        return doSaveChangeRequest(changeRequest, HttpMethod.PUT);
    }

    private Map<String, Object> doSaveChangeRequest(ChangeRequest changeRequest, HttpMethod method) {
        String changeRequestUrl = String.format("%s/manage/api/internal/change-requests", url);
        HttpEntity<ChangeRequest> requestEntity = new HttpEntity<>(changeRequest);
        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(changeRequestUrl, method, requestEntity,
                PARAMETERIZED_TYPE_REFERENCE);
        return responseEntity.getBody();
    }

    @Override
    public List<Map<String, Object>> getChangeRequests(Connection connection) {
        String changeRequestUrl = String.format("%s/manage/api/internal/change-requests/%s/%s",
                url,
                connection.getProtocol().name(),
                connection.getManageIdentifier());
        return restTemplate.getForEntity(changeRequestUrl, List.class).getBody();
    }

    @Override
    public List<Map<String, Object>> getChangeRequestsIdentityProvider(Map<String, Object> identityProvider) {
        String changeRequestUrl = String.format("%s/manage/api/internal/change-requests/%s/%s",
                url,
                EntityType.saml20_idp.name(),
                identityProvider.get("id"));
        return restTemplate.getForEntity(changeRequestUrl, List.class).getBody();
    }

    @Override
    public String changeRequestURL(Connection connection) {
        return String.format("%s/metadata/%s/%s/requests",
                url, connection.getProtocol().name(), connection.getManageIdentifier());
    }

    @Override
    public String changeRequestURLConnectionRequest(EntityType entityType, String manageIdentifier) {
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

        String searchUrl = String.format("%s/manage/api/internal/search/%s",
                url,
                EntityType.saml20_idp.name());
        List<Map<String, Object>> identityProviders = restTemplate.postForObject(
                searchUrl,
                baseQuery, List.class);
        if (identityProviders.isEmpty()) {
            throw new NotFoundException("No identityProviders found for entityID: " + entityID);
        }
        return sanitizeProvider(identityProviders.getFirst());
    }

    @Override
    public List<Map<String, Object>> serviceProvidersByEntityID(List<String> entityIdentifiers) {
        LOG.debug("serviceProvidersByEntityID for : " + entityIdentifiers);

        Map<String, Object> baseQuery = getBaseQuery(false);
        baseQuery.put("entityid", entityIdentifiers);
        return Stream.of(EntityType.oidc10_rp, EntityType.saml20_sp)
                .flatMap(entityType -> {
                    String searchUrl = String.format("%s/manage/api/internal/search/%s",
                            url,
                            entityType.name());
                    List<Map<String, Object>> providers = restTemplate.postForObject(
                            searchUrl,
                            baseQuery,
                            List.class);
                    return providers.stream();
                }).toList();
    }

    @Override
    public List<Map<String, Object>> identityProvidersByInstitutionalGUID(String organisationGUID) {
        LOG.debug("identityProviderByInstitutionalGUID for : " + organisationGUID);

        Map<String, Object> baseQuery = getBaseQuery(true);
        baseQuery.put("metaDataFields.coin:institution_guid", organisationGUID);

        String searchUrl = String.format("%s/manage/api/internal/search/%s",
                url,
                EntityType.saml20_idp.name());
        return restTemplate.postForObject(searchUrl, baseQuery, List.class);
    }

    @Override
    public List<Map<String, Object>> identityProvidersLight() {
        LOG.debug("identityProvidersLight");

        Map<String, Object> baseQuery = getBaseQuery(false);
        ((List) baseQuery.get("REQUESTED_ATTRIBUTES")).add("metaDataFields.coin:institution_type");

        String searchUrl = String.format("%s/manage/api/internal/search/%s",
                url,
                EntityType.saml20_idp.name());
        return restTemplate.postForObject(searchUrl, baseQuery, List.class);
    }

    @Override
    public List<Map<String, Object>> serviceProvidersLight() {
        LOG.debug("serviceProvidersLight");

        Map<String, Object> baseQuery = getBaseQuery(false);
        List requestedAttributes = (List) baseQuery.get("REQUESTED_ATTRIBUTES");
        requestedAttributes.add("metaDataFields.coin:interfed_source");
        requestedAttributes.add("metaDataFields.coin:ss:hidden");
        requestedAttributes.add("metaDataFields.coin:ss:idp_visible_only");
        requestedAttributes.add("metaDataFields.application_tags");

        String spUrl = String.format("%s/manage/api/internal/search/%s", url, EntityType.saml20_sp.name());
        List<Map<String, Object>> serviceProviders = restTemplate.postForObject(spUrl, baseQuery, List.class);

        String rpUrl = String.format("%s/manage/api/internal/search/%s", url, EntityType.oidc10_rp.name());
        List<Map<String, Object>> relyingParties = restTemplate.postForObject(rpUrl, baseQuery, List.class);

        serviceProviders.addAll(relyingParties);
        return serviceProviders;
    }

    @Override
    public Map<String, Integer> stats() {
        LOG.debug("stats");

        String statsUrl = String.format("%s/manage/api/internal/stats", url);
        return restTemplate.getForEntity(statsUrl, Map.class).getBody();
    }

    @Override
    public List<Map<String, Object>> identityProvidersByAllowedConnections(List<Connection> connections) {
        List<Map<String, String>> body = connections.stream()
                .filter(connection -> StringUtils.hasText(connection.getManageIdentifier()) &&
                        connection.getState().equals(State.prodaccepted))
                .map(connection -> Map.of(
                        "id", connection.getManageIdentifier(),
                        "type", connection.getProtocol().name()))
                .toList();
        if (body.isEmpty()) {
            //No use to actually go to Manage
            return List.of();
        }
        String deleteConsequencesUrl = String.format("%s/manage/api/internal/delete-consequences", url);
        return restTemplate.postForEntity(URI.create(deleteConsequencesUrl), body, List.class).getBody();
    }

    @Override
    public List<Map<String, Object>> policiesByServiceProvider(String identityProviderEntityId,
                                                               String serviceProviderEntityId) {
        // Build query using immutable Maps to ensure proper JSON serialization and prevent injection
        Map<String, Object> identityProviderOrCondition = Map.of(
                "data.identityProviderIds.name", identityProviderEntityId
        );
        Map<String, Object> identityProviderExistsFalseCondition = Map.of(
                "data.identityProviderIds", Map.of("$exists", false)
        );
        Map<String, Object> identityProviderSizeZeroCondition = Map.of(
                "data.identityProviderIds", Map.of("$size", 0)
        );
        Map<String, Object> query = Map.of(
                "data.serviceProviderIds.name", serviceProviderEntityId,
                "$or", List.of(
                        identityProviderSizeZeroCondition,
                        identityProviderExistsFalseCondition,
                        identityProviderOrCondition
                )
        );
        String policyUrl = String.format("%s/manage/api/internal/rawSearch/%s", url, EntityType.policy);
        return restTemplate.postForEntity(policyUrl, query, List.class).getBody();
    }

    @Override
    public List<Map<String, Object>> policiesByIdentityProvider(String identityProviderEntityId) {
        Map<String, Object> query = Map.of(
                "data.identityProviderIds.name", identityProviderEntityId
        );
        String policyUrl = String.format("%s/manage/api/internal/rawSearch/%s", url, EntityType.policy);
        return restTemplate.postForEntity(policyUrl, query, List.class).getBody();
    }

    @Override
    public Map<String, Object> createPolicy(Map<String, Object> policy) {
        String policyUrl = String.format("%s/manage/api/internal/metadata", url);
        return restTemplate.postForEntity(policyUrl, policy, Map.class).getBody();
    }

    @Override
    public Map<String, Object> updatePolicy(Map<String, Object> policy) {
        String policyUrl = String.format("%s/manage/api/internal/metadata", url);
        ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(policyUrl, HttpMethod.PUT, new HttpEntity<>(policy), PARAMETERIZED_TYPE_REFERENCE);
        return checkNoChangeResponse(responseEntity, policy);
    }

    @Override
    public List<Map<String, Object>> uniquePolicyName(Map<String, Object> properties) {
        String policyUrl = String.format("%s/manage/api/internal/uniquePolicyName/policy", url);
        return restTemplate.exchange(policyUrl, HttpMethod.POST, new HttpEntity<>(properties), List.class).getBody();
    }

    @Override
    public List<Map<String, Object>> allowedAttributes() {
        String attributesUrl = String.format("%s/manage/api/internal/protected/allowed-attributes", url);
        return restTemplate.getForObject(attributesUrl, List.class);
    }

    @Override
    public void deletePolicy(Map<String, Object> policy) {
        String policyUrl = String.format("%s/manage/api/internal/metadata/%s/%s",
                url, EntityType.policy.name(), policy.get("id"));
        restTemplate.delete(policyUrl);
    }

    @Override
    public Map<String, List<Map<String, Object>>> autoCompleteEntities(EntityType type, String query) {
        String autocompleteUrl = String.format("%s/manage/api/internal/autocomplete/%s?query=%s",
                url,
                type.name(),
                URLEncoder.encode(query, Charset.defaultCharset()));
        return restTemplate.getForObject(autocompleteUrl, Map.class);
    }

    @Override
    public void connectWithoutInteraction(Map<String, Object> identityProvider, Map<String, Object> serviceProvider, User user) {
        String connectUrl = String.format("%s/manage/api/internal/connectWithoutInteraction", url);
        Map<String, String> bodyMap = new HashMap<>();
        bodyMap.put("idpId", (String) getData(identityProvider).get("entityid"));
        bodyMap.put("spId", (String) getData(serviceProvider).get("entityid"));
        bodyMap.put("spType", (String) serviceProvider.get("type"));
        bodyMap.put("user", user.getName());
        bodyMap.put("userUrn", user.getSub());
        //Fire and forget. An exception will be thrown by the restTemplate if the return is not 20X
        restTemplate.put(connectUrl, bodyMap);
    }

    private List<Map<String, Object>> getRemoteMetaData(String type, boolean allAttributes) {
        Map<String, Object> baseQuery = getBaseQuery(allAttributes);
        String searchUrl = String.format("%s/manage/api/internal/search/%s", url, type);
        return restTemplate.postForObject(searchUrl, baseQuery, List.class);
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

    private Map<String, Object> checkNoChangeResponse(ResponseEntity<Map<String, Object>> responseEntity, Map<String, Object> provider) {
        Map<String, Object> body = responseEntity.getBody();
        if (body == null || ResilientErrorHandler.ignoreError(body)) {
            //See ResilientErrorHandler#handleError. Any no-data-changed error is thrown there
            return provider;
        }
        return body;
    }

}
