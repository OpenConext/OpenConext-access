package access.manage;


import access.model.EntityType;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

@NoArgsConstructor
@Getter
public class ChangeRequest implements Serializable {

    private String metaDataId;
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
