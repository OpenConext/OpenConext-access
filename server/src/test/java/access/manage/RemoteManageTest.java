package access.manage;

import access.AbstractTest;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

class RemoteManageTest extends AbstractTest {

    @Autowired
    private Manage manage;

    @Override
    protected boolean seedDatabase() {
        return false;
    }

    @Test
    void providers() throws JsonProcessingException {
        List<Map<String, Object>> serviceProviders = localManage.providers(EntityType.SAML20_SP);
        String body = objectMapper.writeValueAsString(serviceProviders);
        stubFor(post(urlPathMatching("/manage/api/internal/search/saml20_sp")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        List<Map<String, Object>> remoteServiceProviders = manage.providers(EntityType.SAML20_SP);
        assertEquals(4, remoteServiceProviders.size());
    }

    @Test
    void providerById() throws JsonProcessingException {
        Map<String, Object> provider = localManage.providerById(EntityType.SAML20_SP, "1");
        String body = objectMapper.writeValueAsString(provider);
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
        Map<String, Object> remoteProvider = manage.providerById(EntityType.SAML20_SP, "1");
        provider.values().removeIf(Objects::isNull);
        remoteProvider.values().removeIf(Objects::isNull);
        assertEquals(provider, remoteProvider);
    }

    @Test
    void providerByIdExceptionHandling() {
        stubFor(get(urlPathMatching("/manage/api/internal/metadata/saml20_sp/1")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withStatus(404)));
        Map<String, Object> remoteProvider = manage.providerById(EntityType.SAML20_SP, "1");
        assertEquals(0, remoteProvider.size());
    }

}