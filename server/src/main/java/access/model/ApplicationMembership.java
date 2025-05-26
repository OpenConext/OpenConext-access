package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity(name = "application_memberships")
@NoArgsConstructor
@Getter
@Setter
public class ApplicationMembership implements NameHolder{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Application application;

    @ManyToMany(mappedBy = "applicationMemberships", fetch = FetchType.LAZY, cascade = CascadeType.MERGE)
    private Set<OrganizationMembership> organizationMemberships = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Authority authority = Authority.MEMBER;

    public ApplicationMembership(Application application, Authority authority) {
        this.application = application;
        this.authority = authority;
    }

    @Override
    @Transient
    @JsonIgnore
    public String getName() {
        return getClass().getName().concat(application.getName()).concat(authority.name());
    }

}
