package access.model;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ImportEntityRequest {

    @NotNull
    private Long organizationId;

    private Long applicationId;

    @NotNull
    private Map<String, Object> serviceProvider;
}
