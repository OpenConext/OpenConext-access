package access.jira;

import access.exception.InvalidInputException;
import access.mail.MailBox;
import access.model.EntityType;
import access.remote.RestTemplateFactory;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import lombok.SneakyThrows;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

@EnableConfigurationProperties(JiraConfig.class)
@Service
public class JiraClient {

    private static final Logger LOG = LoggerFactory.getLogger(JiraClient.class);

    private final JiraConfig jiraConfig;
    private final MailBox mailBox;
    private final Map<String, Map<String, Map<String, String>>> mappings;
    private final String issueType;
    private RestTemplate restTemplate;

    @SneakyThrows
    @SuppressWarnings("unchcked")
    public JiraClient(JiraConfig jiraConfig, ObjectMapper objectMapper, MailBox mailBox) {
        this.jiraConfig = jiraConfig;
        this.mailBox = mailBox;
        this.mappings = objectMapper.readValue(new ClassPathResource("jira/mappings.json").getInputStream(), new TypeReference<>() {
        });
        this.issueType = this.resolveIssueType();
        if (jiraConfig.isEnabled()) {
            this.restTemplate = RestTemplateFactory.buildRestTemplate(jiraConfig.getApiKey());
        }
    }

    @SuppressWarnings("unchecked")
    public String create(JiraIssue issue) {
        if (!jiraConfig.isEnabled()) {
            return String.format("CXT-%s", ThreadLocalRandom.current().nextInt(1000, 10000));
        }
        Map<String, Object> fields = new HashMap<>();
        fields.put("project", Map.of("key", jiraConfig.getProjectKey()));
        fields.put("customfield_" + spCustomField(), issue.getServiceProviderEntityID());
        fields.put("customfield_" + idpCustomField(), issue.getIdentityProviderEntityID());
        //can be removed when https://jira.ia.surf.nl/servicedesk/customer/portal/1/ISSD-46489 is resolved
        EntityType entityType = issue.getEntityType().equals(EntityType.oauth20_rs) ? EntityType.oidc10_rp : issue.getEntityType();
        fields.put("customfield_" + typeMetaDataCustomField(), Map.of("value", entityType.name()));
        fields.put("customfield_" + emailToCustomField(), issue.getEmailTo());
        fields.put("issuetype", ImmutableMap.of("id", issueType));
        fields.put("summary", issue.getSummary());
        fields.put("description", issue.getDescription());
        fields.put("duedate", dueDate());
        //We don't send keys with null or empty values
        fields.entrySet().removeIf(entry -> entry.getValue() instanceof String && !StringUtils.hasText((String) entry.getValue()));

        Map<String, Map<String, Object>> jiraIssue = Map.of("fields", fields);

        LOG.info("Sending JSON {} to JIRA", jiraIssue);
        String url = jiraConfig.getBaseUrl() + "/issue";
        try {

            Map<String, String> result = restTemplate.postForObject(url, jiraIssue, Map.class);

            LOG.info("Response {} from JIRA", result);

            if (!result.containsKey("key")) {
                mailBox.sendJiraError("create", url, jiraIssue.toString(), "Unexpected JIRA results", result.toString());
            }

            return result.get("key");
        } catch (RuntimeException e) {
            String responseBody;
            if (e instanceof HttpClientErrorException clientException) {
                responseBody = clientException.getResponseBodyAsString();
                LOG.error("Failed to create Jira issue: {} ({}) with response:{}, JSON Request: {}",
                    clientException.getStatusCode(),
                    clientException.getStatusText(),
                    clientException.getResponseBodyAsString(),
                    jiraIssue,
                    e);
            } else {
                responseBody = e.getMessage();
                LOG.error("Failed to create Jira issue: {} ({}) with response:{}, JSON Request: {}",
                    "400",
                    responseBody,
                    responseBody,
                    jiraIssue,
                    e);
            }
            mailBox.sendJiraError("create", url, jiraIssue.toString(), e.getMessage(), responseBody);
            throw e;
        }
    }

    private static final Pattern JIRA_ISSUE_KEY = Pattern.compile("^[A-Z][A-Z0-9]*-[0-9]+$");

    public void comment(String jiraKey, String comment) {
        if (!jiraConfig.isEnabled() || !StringUtils.hasText(jiraKey)) {
            return;
        }
        //jiraKey ends up concatenated into the request URL below - reject anything that isn't a well-formed
        //Jira issue key (e.g. path-traversal segments) before it can redirect the request elsewhere on the host
        if (!JIRA_ISSUE_KEY.matcher(jiraKey).matches()) {
            throw new InvalidInputException("Invalid Jira issue key: " + jiraKey);
        }
        String commentUrl = jiraConfig.getBaseUrl() + "/issue/" + jiraKey + "/comment";
        Map<String, String> body = Map.of("body", comment);
        HttpEntity<Object> commentRequestEntity = new HttpEntity<>(body);

        LOG.info("Sending JSON {} to JIRA", body);

        try {
            ResponseEntity<Map> responseEntity = restTemplate.exchange(commentUrl, HttpMethod.POST, commentRequestEntity, Map.class);
            Map responseBody = responseEntity.getBody();

            LOG.info("Response {} from JIRA", responseBody);

            if (!responseBody.containsKey("body")) {
                mailBox.sendJiraError("create", commentUrl, body.toString(), "Unexpected JIRA results", responseBody.toString());
            }
        } catch (RuntimeException e) {
            String responseBody;
            if (e instanceof HttpClientErrorException clientException) {
                responseBody = clientException.getResponseBodyAsString();
                LOG.error("Failed to post Jira comment: {} ({}) with response:{}, JSON Request: {}",
                    clientException.getStatusCode(),
                    clientException.getStatusText(),
                    clientException.getResponseBodyAsString(),
                    body.toString(),
                    e);
            } else {
                responseBody = e.getMessage();
                LOG.error("Failed to create Jira issue: {} ({}) with response:{}, JSON Request: {}",
                    "400",
                    responseBody,
                    responseBody,
                    body.toString(),
                    e);
            }
            mailBox.sendJiraError("comment", commentUrl, body.toString(), e.getMessage(), responseBody);
            throw e;
        }
    }

    private String resolveIssueType() {
        return this.mappings.get(this.jiraConfig.getEnvironment())
            .get("issueTypes").entrySet().stream()
            .filter(entry -> entry.getKey().equals("change"))
            .map(entry -> entry.getValue())
            .findFirst().get();
    }

    private String spCustomField() {
        return this.customField("spEntityId");
    }

    private String idpCustomField() {
        return this.customField("idpEntityId");
    }

    private String typeMetaDataCustomField() {
        return this.customField("typeMetaData");
    }

    private String emailToCustomField() {
        return this.customField("emailTo");
    }

    private String customField(String name) {
        return this.mappings.get(this.jiraConfig.getEnvironment()).get("customFields").get(name);
    }

    private String dueDate() {
        LocalDate localDate = new Date().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        return localDate.plusWeeks(3).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }

}
