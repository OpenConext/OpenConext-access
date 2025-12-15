package access.manage;

import access.AbstractTest;
import access.model.Connection;
import access.model.EntityType;
import access.model.Environment;
import access.model.State;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.HttpClientErrorException.NotFound;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RemoteManageTest extends AbstractTest {

    @Autowired
    private Manage manage;

    @Override
    protected boolean seedDatabase() {
        return false;
    }

    @Test
    void providers() throws JsonProcessingException {
        List<Map<String, Object>> serviceProviders = localManage.providers(Environment.TEST, EntityType.saml20_sp);
        String body = objectMapper.writeValueAsString(serviceProviders);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_sp")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        List<Map<String, Object>> remoteServiceProviders = manage.providers(Environment.TEST, EntityType.saml20_sp);
        assertEquals(4, remoteServiceProviders.size());
    }

    @Test
    void providerById() throws JsonProcessingException {
        Map<String, Object> provider = localManage.providerById(connection(EntityType.saml20_sp, "1"));
        String body = objectMapper.writeValueAsString(provider);
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        Map<String, Object> remoteProvider = manage.providerById(connection(EntityType.saml20_sp, "1"));
        provider.values().removeIf(Objects::isNull);
        remoteProvider.values().removeIf(Objects::isNull);
        assertEquals(provider, remoteProvider);
    }

    @Test
    void providerByIdNoDataChanged() throws JsonProcessingException {
        Map<String, String> errorMap = Map.of("validations", "No data is changed");
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(errorMap))
                .withStatus(404)));
        Map<String, Object> remoteProvider = manage.providerById(connection(EntityType.saml20_sp, "1"));
        assertEquals(errorMap, remoteProvider);
    }

    @Test
    void providerByIdExceptionHandling() throws JsonProcessingException {
        Map<String, String> errorMap = Map.of("error", "NotFound");
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(errorMap))
                .withStatus(404)));
        assertThrows(NotFound.class, () -> manage.providerById(connection(EntityType.saml20_sp, "1")));

    }

    @Test
    void identityProvidersLight() throws JsonProcessingException {
        List<Map<String, Object>> identityProviders = localManage.providers(Environment.TEST, EntityType.saml20_idp);
        String body = objectMapper.writeValueAsString(identityProviders);

        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_idp")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));

        List<Map<String, Object>> remoteIdentityProviders = manage.identityProvidersLight(Environment.TEST);
        assertEquals(3, remoteIdentityProviders.size());
    }

    @Test
    void identityProvidersByAllowedConnections() throws JsonProcessingException {
        List<Connection> connections = List.of(
                connection(EntityType.saml20_sp, "4"),
                connection(EntityType.oidc10_rp, "5")
        );
        List<Map<String, Object>> identityProviders = localManage.identityProvidersByAllowedConnections(connections);
        String body = objectMapper.writeValueAsString(identityProviders);
        stubFor(post(urlEqualTo("/manage/api/internal/delete-consequences")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        List<Map<String, Object>> remoteIdentityProviders = manage.identityProvidersByAllowedConnections(connections);
        assertEquals(identityProviders, remoteIdentityProviders);
    }

    private Connection connection(EntityType entityType, String manageIdentifier) {
        Connection connection = new Connection();
        connection.setManageIdentifier(manageIdentifier);
        connection.setProtocol(entityType);
        connection.setEnvironment(Environment.PROD);
        connection.setState(State.prodaccepted);
        return connection;
    }
}