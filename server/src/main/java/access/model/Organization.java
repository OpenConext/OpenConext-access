package access.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity(name = "organizations")
@NoArgsConstructor
@Getter
@Setter
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @Column(name = "schac_home_organization")
    private String schacHomeOrganization;

    @Column(name = "created_at")
    private Instant createdAt;

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Application> applications = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<OrganizationMembership> organizationMemberships = new HashSet<>();

    @Formula(value = "(SELECT COUNT(*) FROM organization_memberships om WHERE om.organization_id=id)")
    private Long memberCount;

    public Organization(String name, String schacHomeOrganization) {
        this.name = name;
        this.schacHomeOrganization = schacHomeOrganization;
        this.createdAt = Instant.now();
    }
}
