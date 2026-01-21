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

    private String entityID;
    private String name;
    private String organizationName;
    private boolean allowedall;
    private List<String> allowedEntities;

    public Institution(Map<String, Object> provider) {
        Map<String, Object> data = getData(provider);
        this.allowedall = (boolean) data.getOrDefault("allowedall", false);
        this.allowedEntities = ((List<Map<String, String>>) data.getOrDefault("allowedEntities", Map.of()))
                .stream()
                .map(allowedEntity -> allowedEntity.get("name"))
                .toList();
        Map<String, Object> metaDataFields = getMetaDataFields(data);
        this.entityID = (String) data.get("entityid");
        this.name = (String) metaDataFields.get("name:en");
        this.organizationName = (String) metaDataFields.get("OrganizationName:en");
    }
}
