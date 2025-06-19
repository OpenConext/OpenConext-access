package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Entity(name = "organization_memberships")
@NoArgsConstructor
@Getter
@Setter
public class OrganizationMembership implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at")
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Authority authority = Authority.MEMBER;

    @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinTable(name = "organization_memberships_application_memberships",
            joinColumns = @JoinColumn(name = "organization_membership_id"),
            inverseJoinColumns = @JoinColumn(name = "application_membership_id"))
    private Set<ApplicationMembership> applicationMemberships = new HashSet<>();

    @Transient
    private String transientName;

    public OrganizationMembership(User user, Organization organization, Authority authority) {
        this.user = user;
        this.organization = organization;
        this.authority = authority;
        this.transientName = getClass().getName().concat(organization.getName()).concat(authority.name());
        this.createdAt = Instant.now();
    }

    @JsonIgnore
    public ApplicationMembership addApplicationMembership(ApplicationMembership applicationMemberships) {
        this.applicationMemberships.add(applicationMemberships);
        return applicationMemberships;
    }

    //We need organization info, but we don't want cyclic JSON deserialization
    public Map<String, Serializable> getOrganizationInfo() {
        return Map.of("id", organization.getId(),
                "name", organization.getName());
    }

    //We need user info, but we don't want cyclic JSON deserialization
    public Map<String, Serializable> getUserInfo() {
        User user = getUser();

        return user != null ? Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "schacHomeOrganization", user.getSchacHomeOrganization()
        ) : Map.of();
    }

    @JsonIgnore
    public void removeApplicationMembership(ApplicationMembership applicationMembership) {
        //This is required by Hibernate - children can't be dereferenced
        this.removeApplicationMemberships(List.of(applicationMembership));
    }

    @JsonIgnore
    public void removeApplicationMemberships(List<ApplicationMembership> applicationMemberships) {
        //This is required by Hibernate - children can't be dereferenced
        List<Long> applicationMembershipsIdentifiers = applicationMemberships.stream().map(am -> am.getId()).toList();
        Set<ApplicationMembership> newApplicationMemberships = this.applicationMemberships
                .stream().filter(am -> !applicationMembershipsIdentifiers.contains(am.getId())).collect(Collectors.toSet());
        this.applicationMemberships.clear();
        this.applicationMemberships.addAll(newApplicationMemberships);
    }

    @Override
    @Transient
    @JsonIgnore
    public String getName() {
        return transientName;
    }

}
