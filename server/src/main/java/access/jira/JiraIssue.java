package access.jira;

import access.model.EntityType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;

@Getter
@AllArgsConstructor
public class JiraIssue {

    private String serviceProviderEntityID;
    private String identityProviderEntityID;
    private String description;
    private String summary;
    private EntityType entityType;
    private String emailTo;

}
