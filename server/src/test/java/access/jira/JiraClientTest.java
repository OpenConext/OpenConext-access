package access.jira;

import access.AbstractMailTest;
import access.model.EntityType;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "oidcng.introspect-url=http://localhost:8081/introspect",
                "spring.security.oauth2.client.provider.oidcng.authorization-uri=http://localhost:8081/authorization",
                "spring.security.oauth2.client.provider.oidcng.token-uri=http://localhost:8081/token",
                "spring.security.oauth2.client.provider.oidcng.user-info-uri=http://localhost:8081/user-info",
                "spring.security.oauth2.client.provider.oidcng.jwk-set-uri=http://localhost:8081/jwk-set",
                "manage.enabled=false",
                "jira.enabled=true",
                "jira.base-url=http://localhost:8081"
        })
class JiraClientTest extends AbstractMailTest {

    @Autowired
    private JiraClient jiraClient;

    @SneakyThrows
    @Test
    void create() {
        Map<String, String> response = Map.of("key", "CTX-1000");
        stubFor(post(urlPathMatching("/issue")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(objectMapper.writeValueAsString(response))));

        String jiraKey = jiraClient.create(new JiraIssue(
                "serviceProviderEntityID",
                "identityProviderEntityID",
                "description",
                "summary",
                EntityType.saml20_sp,
                "mail@to.org"));
        assertEquals("CTX-1000", jiraKey);
    }

    @Test
    void comment() {
        String jiraKey = "CTX-1000";
        stubFor(post(urlPathMatching("/issue/" + jiraKey + "/comment")).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withStatus(200)));

        jiraClient.comment(jiraKey, "Comment");
    }

    @SneakyThrows
    @Test
    void createSendsErrorMail() {
        stubFor(post(urlPathMatching("/issue")).willReturn(aResponse()
                .withStatus(400)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"errorMessages\":[\"Invalid field\"]}")));

        assertThrows(HttpClientErrorException.class, () -> jiraClient.create(new JiraIssue(
                "serviceProviderEntityID",
                "identityProviderEntityID",
                "description",
                "summary",
                EntityType.saml20_sp,
                "mail@to.org")));

        var mail = mailMessage();
        assertTrue(mail.getHtmlContent().contains("create"));
        assertTrue(mail.getHtmlContent().contains("Invalid field"));
    }

    @Test
    void commentSendsErrorMail() {
        String jiraKey = "CTX-1000";
        stubFor(post(urlPathMatching("/issue/" + jiraKey + "/comment")).willReturn(aResponse()
                .withStatus(400)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"errorMessages\":[\"Comment error\"]}")));

        assertThrows(HttpClientErrorException.class, () -> jiraClient.comment(jiraKey, "Comment"));

        var mail = mailMessage();
        assertTrue(mail.getHtmlContent().contains("comment"));
        assertTrue(mail.getHtmlContent().contains("Comment error"));
    }
}
