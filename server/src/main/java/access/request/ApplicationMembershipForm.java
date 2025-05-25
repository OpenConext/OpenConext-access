package access.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationMembershipForm {
    private Long organizationId;
    private Long applicationId;
    private Long organizationMembershipId;

}
