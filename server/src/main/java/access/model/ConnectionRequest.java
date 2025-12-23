package access.model;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class ConnectionRequest implements Serializable {

    private String applicationManageIdentifier;
    private EntityType entityType;
    private String idpManageIdentifier;

}
