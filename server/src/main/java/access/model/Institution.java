package access.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Map;

@Getter
@Setter
@SuppressWarnings("unchecked")
@NoArgsConstructor
public class Institution implements Serializable {

    private String entityID;
    private String name;
    private String organizationName;

    public Institution(Map<String, Object> provider) {
        Map<String, Object> data = (Map<String, Object>) provider.get("data");
        Map<String, Object> metaDataFields = (Map<String, Object>) data.get("metaDataFields");
        this.entityID = (String) data.get("entityid");
        this.name = (String) metaDataFields.get("name:en");
        this.organizationName = (String) metaDataFields.get("OrganizationName:en");
    }
}
