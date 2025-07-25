package access.jira;

import access.model.EntityType;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class JiraIssue {

    private String entityID;
    private String description;
    private String summary;
    private EntityType entityType;
    private String emailTo;

}
