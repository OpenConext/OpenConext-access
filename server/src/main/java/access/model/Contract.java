package access.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
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

    @Column(name = "application_name")
    @NotNull
    private String applicationName;

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
    @JoinColumn(name = "application_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Application application;

    //We need application info, but we don't want cyclic JSON deserialization
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "application")
    public Map<String, Serializable> getApplicationInfo() {
        Application app = getApplication();
        Map<String, Serializable> applicationInfo = new HashMap<>();
        if (app != null && Hibernate.isInitialized(app)) {
            applicationInfo.put("id", app.getId());
            applicationInfo.put("name", app.getName());
        }
        return applicationInfo;
    }

}
