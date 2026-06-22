package access.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.Hibernate;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

@Entity(name = "contracts")
@NoArgsConstructor
@Getter
@Setter
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_name")
    @NotNull
    private String providerName;

    @Column(name = "organization_name")
    @NotNull
    private String organizationName;

    @Column(name = "signee_name")
    @NotNull
    private String signeeName;

    @Column(name = "signee_title")
    private String signeeTitle;

    @Column
    private String address;

    @Column
    private String country;

    @Column
    private String telephone;

    @Column
    @NotNull
    private String email;

    @Column(name = "signed_contract")
    private boolean signedContract;

    @Column(name = "ticket_key")
    private String ticketKey;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    //We need organization info, but we don't want cyclic JSON deserialization
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "organization")
    public Map<String, Serializable> getOrganizationInfo() {
        Organization org = getOrganization();
        Map<String, Serializable> organizationInfo = new HashMap<>();
        if (org != null && Hibernate.isInitialized(org)) {
            organizationInfo.put("id", org.getId());
            organizationInfo.put("name", org.getName());
        }
        return organizationInfo;
    }

}
