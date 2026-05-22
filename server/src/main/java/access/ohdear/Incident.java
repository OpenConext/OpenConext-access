package access.ohdear;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
public class Incident {
    private String startedAt;
    @Setter
    private String resolvedAt;
    private String message;

}
