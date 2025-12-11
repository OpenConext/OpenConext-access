package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.Hibernate;

import java.time.Instant;

@Entity(name = "application_memberships")
@NoArgsConstructor
@Getter
@Setter
public class ApplicationMembership implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at")
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Application application;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_membership_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private OrganizationMembership organizationMembership;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Authority authority = Authority.MEMBER;

    public ApplicationMembership(Application application, OrganizationMembership organizationMembership) {
        this.application = application;
        this.organizationMembership = organizationMembership;
        this.createdAt = Instant.now();
    }

    @Override
    @Transient
    @JsonIgnore
    public String getName() {
        return getClass().getName().concat(application.getName()).concat(authority.name());
    }

    //We need info, about the application
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "applicationIdentifier")
    public Long getApplicationIndentifier() {
        Application application = getApplication();
        if (application != null && Hibernate.isInitialized(application)) {
            return application.getId();
        }
        return null;
    }

    @JsonProperty(value = "organizationMembershipIdentifier", access = JsonProperty.Access.READ_ONLY)
    public Long getOrganizationMembershipInfo() {
        OrganizationMembership organizationMembership = this.getOrganizationMembership();
        Hibernate.initialize(organizationMembership);
        return organizationMembership.getId();
    }

}
