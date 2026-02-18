package access.manage;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@NoArgsConstructor
@Getter
@Setter
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PolicyDefinition {

    private boolean active;

    private boolean allAttributesMustMatch;

    private List<PolicyAttribute> attributes = new ArrayList<>();

    private List<LoA> loas = new ArrayList<>();

    private String denyAdvice;

    private String denyAdviceNl;

    private boolean denyRule;

    private String description;

    private String entityid;

    private List<PolicyProvider> identityProviderIds = new ArrayList<>();

    private Map<String, String> metaDataFields = new HashMap<>();

    private String name;

    private List<PolicyProvider> serviceProviderIds = new ArrayList<>();

    private boolean serviceProvidersNegated;

    private String type;

}
