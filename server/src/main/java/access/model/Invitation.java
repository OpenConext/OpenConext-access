package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.Hibernate;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Entity(name = "invitations")
@NoArgsConstructor
@Getter
@Setter
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @NotNull
    private Language language;

    @Enumerated(EnumType.STRING)
    private InvitationStatus status = InvitationStatus.OPEN;

    @Column
    private String hash;

    @Column
    @NotNull
    private String email;

    @Column
    private String message;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "expiry_date")
    private Instant expiryDate;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "intended_authority")
    @NotNull
    private Authority intendedAuthority = Authority.MEMBER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitee_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private User invitee;

    @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.MERGE)
    @JoinTable(name = "invitations_applications",
            joinColumns = @JoinColumn(name = "invitation_id"),
            inverseJoinColumns = @JoinColumn(name = "application_id"))
    private Set<Application> applications = new HashSet<>();


    public Invitation(Language language,
                      String hash,
                      String email,
                      String message,
                      Authority intendedAuthority,
                      Organization organization,
                      User invitee,
                      Set<Application> applications) {
        this.language = language;
        this.hash = hash;
        this.email = email;
        this.message = message;
        this.intendedAuthority = intendedAuthority;
        this.organization = organization;
        this.invitee = invitee;
        this.applications = applications;
        this.createdAt = Instant.now();
        this.expiryDate = this.createdAt.plus(30, ChronoUnit.DAYS);
    }


    //used in the mustache templates
    @JsonIgnore
    public List<String> anyApplications() {
        return CollectionUtils.isEmpty(this.applications) ? Collections.emptyList() : Arrays.asList("will-iterate-once");
    }

    @JsonProperty(value = "inviter", access = JsonProperty.Access.READ_ONLY)
    public Map<String, Object> getInviterEmail() {
        User inviter = this.getInvitee();
        Map<String, Object> info = new HashMap<>();
        if (inviter != null && Hibernate.isInitialized(inviter)) {
            info.put("email", inviter.getEmail());
            info.put("name", StringUtils.hasText(inviter.getName()) ? inviter.getName() : inviter.getEmail());
            info.put("user_id", inviter.getId());
        }
        return info;
    }

    @JsonProperty(value = "organization", access = JsonProperty.Access.READ_ONLY)
    public Map<String, Object> getOrganizationInfo() {
        Organization organization = this.getOrganization();
        Map<String, Object> info = new HashMap<>();
        if (organization != null && Hibernate.isInitialized(organization)) {
            info.put("name", organization.getName());
            info.put("id", organization.getId());
        }
        return info;
    }

    @JsonIgnore
    public void accept() {
        this.status = InvitationStatus.ACCEPTED;
        this.hash = null;
        this.acceptedAt = Instant.now();
    }
}
