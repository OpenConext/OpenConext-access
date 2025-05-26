package access.request;

import access.model.Language;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestForm {
    private Long organizationId;
    private boolean force;
    private Language language;
}
