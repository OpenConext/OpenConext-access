package access.ohdear;

import java.util.List;

public record ServiceStatus(Long id,
                            String name,
                            String url,
                            String status, // operational | degraded | down
                            Double uptimePercentage,
                            List<Incident> incidents) {
}
