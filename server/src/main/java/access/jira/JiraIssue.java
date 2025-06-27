package access.jira;

import access.model.EntityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@AllArgsConstructor
public class JiraIssue {

    private String entityID;
    private String description;
    private String summary;
    private EntityType entityType;
    private String emailTo;

}
