package access.request;

import access.model.Authority;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestApproval {

    private Long joinRequestId;
    private boolean approved;
    private Authority authority;

}
