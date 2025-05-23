package access.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity(name = "organization_memberships")
@NoArgsConstructor
@Getter
@Setter
public class OrganizationMembership {

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
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Authority authority = Authority.GUEST;

    @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinTable(name = "collaboration_memberships_application_memberships",
            joinColumns = @JoinColumn(name = "collaboration_membership_id"),
            inverseJoinColumns = @JoinColumn(name = "application_membership_id"))
    private Set<ApplicationMembership> applicationMemberships = new HashSet<>();

    public OrganizationMembership(User user, Organization organization, Authority authority) {
        this.user = user;
        this.organization = organization;
        this.authority = authority;
        this.createdAt = Instant.now();
    }


}
