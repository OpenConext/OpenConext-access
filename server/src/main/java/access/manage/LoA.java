package access.manage;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class LoA {

    private String level;

    private boolean allAttributesMustMatch;

    private boolean negateCidrNotation;

    private List<PolicyAttribute> attributes = new ArrayList<>();

    private List<CidrNotation> cidrNotations = new ArrayList<>();

}
