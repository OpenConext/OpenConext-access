package access.manage;


import access.model.EntityType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import java.io.Serializable;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;

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

    private RequestType requestType;

    private Instant created;

    @Setter
    private String ticketKey;

    public ChangeRequest(Map<String, Object> manageChangeRequest) {
        this.id = (String) manageChangeRequest.get("id");
        this.type = (String) manageChangeRequest.get("type");
        this.metaDataId = (String) manageChangeRequest.get("metaDataId");
    }

    public ChangeRequest(String metaDataId,
                         EntityType entityType,
                         Map<String, Object> pathUpdates,
                         boolean incrementalChange,
                         PathUpdateType pathUpdateType,
                         RequestType requestType) {
        this.metaDataId = metaDataId;
        this.type = entityType.name();
        this.pathUpdates = pathUpdates;
        this.incrementalChange = incrementalChange;
        this.pathUpdateType = pathUpdateType;
        this.requestType = requestType;
    }

    public void setAuditData(Map<String, Object> auditData) {
        this.auditData = auditData;
        this.note = auditData != null ? (String) auditData.get("notes") : null;
    }

    @JsonIgnore
    public boolean matches(Map<String, Object> changeRequestMap) {
        String pathUpdateTypeString = this.pathUpdateType != null ? this.pathUpdateType.name() : null;
        String requestTypeString = this.requestType != null ? this.requestType.name() : null;
        return Objects.equals(changeRequestMap.get("pathUpdateType"), pathUpdateTypeString) &&
                Objects.equals(changeRequestMap.get("requestType"), requestTypeString) &&
                Objects.equals(changeRequestMap.get("pathUpdates"), pathUpdates) ;
    }
}
