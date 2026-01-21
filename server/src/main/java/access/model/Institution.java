package access.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

import static access.manage.ManageData.getData;
import static access.manage.ManageData.getMetaDataFields;

@Getter
@Setter
@SuppressWarnings("unchecked")
@NoArgsConstructor
public class Institution implements Serializable {

    private String manageIdentifier;
    private String entityID;
    private String name;
    private String organizationName;

    public Institution(Map<String, Object> provider) {
        this.manageIdentifier = (String) provider.get("_id");
        Map<String, Object> data = getData(provider);
        Map<String, Object> metaDataFields = getMetaDataFields(data);
        this.entityID = (String) data.get("entityid");
        this.name = (String) metaDataFields.get("name:en");
        this.organizationName = (String) metaDataFields.get("OrganizationName:en");
    }
}
