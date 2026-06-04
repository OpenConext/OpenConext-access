package access.manage;

import access.AbstractTest;
import access.model.Connection;
import access.model.EntityType;
import access.model.State;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.HttpClientErrorException;
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
        List<Map<String, Object>> serviceProviders = localManage.providers(EntityType.saml20_sp);
        String body = objectMapper.writeValueAsString(serviceProviders);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_sp")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        List<Map<String, Object>> remoteServiceProviders = manage.providers(EntityType.saml20_sp);
        assertEquals(4, remoteServiceProviders.size());
    }

    @Test
    void providerByConnection() throws JsonProcessingException {
        Map<String, Object> provider = localManage.providerByConnection(connection(EntityType.saml20_sp, "1"));
        String body = objectMapper.writeValueAsString(provider);
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        Map<String, Object> remoteProvider = manage.providerByConnection(connection(EntityType.saml20_sp, "1"));
        provider.values().removeIf(Objects::isNull);
        remoteProvider.values().removeIf(Objects::isNull);
        assertEquals(provider, remoteProvider);
    }

    @Test
    void providerByConnectionNoDataChanged() throws JsonProcessingException {
        Map<String, String> errorMap = Map.of("validations", "No data is changed");
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(errorMap))
                .withStatus(404)));
        Map<String, Object> remoteProvider = manage.providerByConnection(connection(EntityType.saml20_sp, "1"));
        assertEquals(errorMap, remoteProvider);
    }

    @Test
    void providerByConnectionExceptionHandling() throws JsonProcessingException {
        Map<String, String> errorMap = Map.of("error", "NotFound");
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(errorMap))
                .withStatus(404)));
        assertThrows(NotFound.class, () -> manage.providerByConnection(connection(EntityType.saml20_sp, "1")));

    }

    @Test
    void identityProvidersLight() throws JsonProcessingException {
        List<Map<String, Object>> identityProviders = localManage.providers(EntityType.saml20_idp);
        String body = objectMapper.writeValueAsString(identityProviders);

        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_idp")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));

        List<Map<String, Object>> remoteIdentityProviders = manage.identityProvidersLight();
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

    @SneakyThrows
    @Test
    void providerNotFound() {
        Map<String, Object> provider = localManage.identityProviderByEntityID("http://mock-idp");
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_idp")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(provider))
                .withStatus(404)));
        assertThrows(HttpClientErrorException.NotFound.class, () -> manage.identityProviderByEntityID("http://mock-idp"));
    }

    @SneakyThrows
    @Test
    void policiesByServiceProviders() {
        String body = new String(getClass().getClassLoader()
                .getResourceAsStream("manage/policies.json").readAllBytes());
        stubFor(post(urlPathMatching("/manage/api/internal/rawSearch/policy")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        List<Map<String, Object>> policies = manage.policiesByServiceProviders(
                List.of("SURFACCESS-c85b455c-3f42-4945-b224-3ae433f2be0b"));
        assertEquals(1, policies.size());
    }

}