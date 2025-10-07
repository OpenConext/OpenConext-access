package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.Hibernate;

import java.io.Serializable;
import java.time.Instant;
import java.util.*;
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

    @OneToMany(mappedBy = "organizationMembership", orphanRemoval = true, fetch = FetchType.LAZY)
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
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "organization")
    public Map<String, Serializable> getOrganizationInfo() {
        Organization organization = getOrganization();
        Map<String, Serializable> organizationInfo = new HashMap<>();
        if (organization != null && Hibernate.isInitialized(organization)) {
            organizationInfo.put("id", organization.getId());
            organizationInfo.put("name", organization.getName());
            organizationInfo.put("status", organization.getStatus());
            organizationInfo.put("schacHomeOrganization", organization.getSchacHomeOrganization());
        }
        return organizationInfo;
    }

    //We need user info, but we don't want cyclic JSON deserialization
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "user")
    public Map<String, Serializable> getUserInfo() {
        User user = getUser();
        Map<String, Serializable> userInfo = new HashMap<>();
        if (user != null && Hibernate.isInitialized(user)) {
            userInfo.put("id", user.getId());
            userInfo.put("name", user.getName());
            userInfo.put("email", user.getEmail());
            userInfo.put("schacHomeOrganization", user.getSchacHomeOrganization());
        }
        return userInfo;
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
