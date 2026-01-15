package access.invite;

import access.AbstractTest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;

import java.util.List;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static org.junit.jupiter.api.Assertions.*;

class InviteClientTest extends AbstractTest {

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected InviteClient inviteClient;

    @SneakyThrows
    @Test
    void rolesPerOrganizationApplicationId() {
        List<Map<String, Object>> roles = objectMapper.readValue(new ClassPathResource("/invite/roles.json").getInputStream(), new TypeReference<>() {
        });
        String rolesResult = objectMapper.writeValueAsString(roles);

        String organizationGUID = "organizationGUID";
        String applicationManageId = "manageId";
        stubFor(get(urlPathMatching("/api/external/v1/internal/invite/roles/" + organizationGUID + "/" + applicationManageId)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(rolesResult)));
        roles = inviteClient.rolesPerOrganizationApplicationId(organizationGUID, applicationManageId);
        assertEquals(1, roles.size());
        assertEquals("Test Role Profile", roles.getFirst().get("name"));
    }
}