package access.ohdear;

import java.util.List;

public record Group(String name, List<ServiceStatus> services) {
}
