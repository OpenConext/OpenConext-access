package access.ohdear;

import java.util.List;

public record StatusResponse(String overallStatus, String lastUpdated, List<Group> groups) {
}
