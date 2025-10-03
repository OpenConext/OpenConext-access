package access.manage;


import access.model.EntityType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Map;

@NoArgsConstructor
@Getter
public class ChangeRequest implements Serializable {

    @Setter
    private String id;
    @Setter
    private String metaDataId;
    @Setter
    private String type;
    private String note;
    private Map<String, Object> pathUpdates;
    private Map<String, Object> auditData;

    private boolean incrementalChange;

    private PathUpdateType pathUpdateType;

    public ChangeRequest(String metaDataId,
                         EntityType entityType,
                         Map<String, Object> pathUpdates,
                         Map<String, Object> auditData,
                         boolean incrementalChange,
                         PathUpdateType pathUpdateType) {
        this.metaDataId = metaDataId;
        this.type = entityType.name();
        this.note = auditData != null ? (String) auditData.get("notes") : null;
        this.pathUpdates = pathUpdates;
        this.auditData = auditData;
        this.incrementalChange = incrementalChange;
        this.pathUpdateType = pathUpdateType;
    }

}
