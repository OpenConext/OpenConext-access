package access.ohdear;

import java.util.List;

public record StatusResponse(String overallStatus, List<ServiceStatus> services) {
}
