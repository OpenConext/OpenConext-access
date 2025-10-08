package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity(name = "organizations")
@NoArgsConstructor
@Getter
@Setter
public class Organization implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @Column(name = "schac_home_organization")
    private String schacHomeOrganization;

    @Column(name = "ticket_key")
    private String ticketKey;

    @Column(name = "created_at")
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private OrganizationStatus status = OrganizationStatus.PENDING_APPROVAL;

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Application> applications = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<OrganizationMembership> organizationMemberships = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<JoinRequest> joinRequests = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Invitation> invitations = new HashSet<>();

    @Formula(value = "(SELECT COUNT(*) FROM organization_memberships om WHERE om.organization_id=id)")
    private Long memberCount;

    @Formula(value = "(SELECT COUNT(*) FROM applications a WHERE a.organization_id=id)")
    private Long applicationCount;

    public Organization(String name, String schacHomeOrganization) {
        this.name = name;
        this.schacHomeOrganization = schacHomeOrganization;
        this.createdAt = Instant.now();
    }

    @JsonIgnore
    public OrganizationMembership addOrganizationMembership(OrganizationMembership organizationMembership) {
        this.organizationMemberships.add(organizationMembership);
        organizationMembership.setOrganization(this);
        return organizationMembership;
    }

    @JsonIgnore
    public void removeApplication(Application application) {
        //This is required by Hibernate - children can't be dereferenced
        Set<Application> newApplications = this.applications
                .stream().filter(app -> !app.getId().equals(application.getId())).collect(Collectors.toSet());
        this.applications.clear();
        this.applications.addAll(newApplications);
    }

    @JsonIgnore
    public void removeJoinRequest(JoinRequest joinRequest) {
        //This is required by Hibernate - children can't be dereferenced
        Set<JoinRequest> newJoinRequests = this.joinRequests
                .stream().filter(jr -> !jr.getId().equals(joinRequest.getId())).collect(Collectors.toSet());
        this.joinRequests.clear();
        this.joinRequests.addAll(newJoinRequests);
    }

}
