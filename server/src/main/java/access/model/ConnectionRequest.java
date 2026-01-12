package access.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ConnectionRequest implements Serializable {

    private String applicationManageIdentifier;
    private EntityType entityType;
    private String idpManageIdentifier;
    private String message;

}
