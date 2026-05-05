package access.ohdear;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Getter
public class Incident {
    private String startedAt;
    @Setter
    private String resolvedAt;
    private String message;

}
