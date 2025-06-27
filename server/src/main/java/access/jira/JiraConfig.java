package access.jira;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jira")
@Getter
@Setter
@NoArgsConstructor
public class JiraConfig {

    private boolean enabled;
    private String baseUrl;
    private String userName;
    private String projectKey;
    private String environment;
    private String apiKey;
    private int connectionTimeout;

}
