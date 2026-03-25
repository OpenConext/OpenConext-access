package access.model;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MigrateApplicationRequest {

    @NotNull
    private Long applicationId;
    @NotNull
    private Long newOrganizationId;
}
