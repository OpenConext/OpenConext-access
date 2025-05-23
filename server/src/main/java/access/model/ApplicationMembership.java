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
public class ApplicationMembership {

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
    private Authority authority = Authority.GUEST;

    public ApplicationMembership(Authority authority) {
        this.authority = authority;
    }

    @JsonIgnore
    public OrganizationMembership addOrganizationMembership(OrganizationMembership organizationMembership) {
        this.organizationMemberships.add(organizationMembership);
        return organizationMembership;
    }

    @JsonIgnore
    public void removeApplicationMembership(OrganizationMembership organizationMembership) {
        //This is required by Hibernate - children can't be dereferenced
        Set<OrganizationMembership> newOrganizationMemberships = this.organizationMemberships
                .stream().filter(om -> !om.getId().equals(organizationMembership.getId())).collect(Collectors.toSet());
        this.organizationMemberships.clear();
        this.organizationMemberships.addAll(newOrganizationMemberships);
    }

}
