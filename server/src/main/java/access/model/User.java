package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.util.StringUtils;

import java.io.Serializable;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;


@Entity(name = "users")
@NoArgsConstructor
@Getter
@Setter
@SuppressWarnings("unchecked")
public class User implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String sub;

    @Column(name = "super_user")
    @NotNull
    private boolean superUser;

    @Column(name = "eduperson_principal_name")
    private String eduPersonPrincipalName;

    @Column(name = "given_name")
    private String givenName;

    @Column(name = "family_name")
    private String familyName;

    @Column(name = "name")
    private String name;

    @Column(name = "subject_id")
    private String subjectId;

    @Column(name = "eduid")
    private String eduId;

    @Column(name = "uid")
    private String uid;

    @Column(name = "schac_home_organization")
    private String schacHomeOrganization;

    @Column
    private String email;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "last_activity")
    private Instant lastActivity;

    @Column(name = "organization_guid")
    private String organizationGUID;

    @Column(name = "institution_admin")
    @NotNull
    private boolean institutionAdmin;

    @OneToMany(mappedBy = "user", orphanRemoval = true, fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    private Set<OrganizationMembership> organizationMemberships = new HashSet<>();

    @OneToMany(mappedBy = "user", orphanRemoval = true, fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    private Set<JoinRequest> joinRequests = new HashSet<>();

    public User(Map<String, Object> attributes) {
        this(false, attributes);
    }

    public User(boolean superUser, Map<String, Object> attributes) {
        this.superUser = superUser;
        this.sub = (String) attributes.get("sub");
        this.eduPersonPrincipalName = (String) attributes.get("eduperson_principal_name");
        this.schacHomeOrganization = (String) attributes.get("schac_home_organization");
        this.email = (String) attributes.get("email");
        this.givenName = (String) attributes.get("given_name");
        this.familyName = (String) attributes.get("family_name");
        this.subjectId = (String) attributes.get("subject_id");
        this.eduId = (String) attributes.get("eduid");
        this.uid = ((List<String>) attributes.getOrDefault("uids", List.of())).stream().findAny().orElse(null);
        this.createdAt = Instant.now();
        this.lastActivity = this.createdAt;

        //Defensive mode, EPPN is not a required attribute for invite SP
        if (!StringUtils.hasText(this.eduPersonPrincipalName)) {
            this.eduPersonPrincipalName = this.email;
        }

        this.nameInvariant(attributes);
    }

    private void nameInvariant(Map<String, Object> attributes) {
        String name = (String) attributes.get("name");
        String preferredUsername = (String) attributes.get("preferred_username");
        if (StringUtils.hasText(name)) {
            this.name = name;
        } else if (StringUtils.hasText(preferredUsername)) {
            this.name = preferredUsername;
        } else if (StringUtils.hasText(this.givenName) && StringUtils.hasText(this.familyName)) {
            this.name = this.givenName + " " + this.familyName;
        } else if (StringUtils.hasText(this.email) && this.email.contains("@")) {
            this.name = Stream.of(this.email.substring(0, this.email.indexOf("@")).toLowerCase().split("\\."))
                    .map(StringUtils::capitalize)
                    .collect(Collectors.joining(" "));
        } else if (StringUtils.hasText(this.sub)) {
            this.name = StringUtils.capitalize(this.sub.substring(this.sub.lastIndexOf(":") + 1));
        }
        nameInvariant();
    }

    public void nameInvariant() {
        if (!StringUtils.hasText(this.givenName) &&
                !StringUtils.hasText(this.familyName) &&
                StringUtils.hasText(this.name) &&
                this.name.contains(" ")) {
            List<String> names = Arrays.asList(this.name.split(" "));
            this.givenName = names.get(0);
            this.familyName = String.join(" ", names.stream().skip(1).toList());
        }
    }

    public User(boolean superUser, String eppn, String sub, String schacHomeOrganization, String givenName, String familyName, String email) {
        this.superUser = superUser;
        this.eduPersonPrincipalName = eppn;
        this.sub = sub;
        this.schacHomeOrganization = schacHomeOrganization;
        this.givenName = givenName;
        this.familyName = familyName;
        this.name = String.format("%s %s", givenName, familyName);
        this.email = email;
        this.createdAt = Instant.now();
        this.lastActivity = Instant.now();
    }

    @JsonIgnore
    public Map<String, Object> asMap() {
        if (!StringUtils.hasText(sub)) {
            throw new IllegalArgumentException("Sub is empty for User: " + this.getId());
        }
        //Avoid null-pointers (at any cost). Minimal requirement is sub as this is a non-null database column
        String notNullIdentifier = StringUtils.hasText(email) ? email : StringUtils.hasText(eduPersonPrincipalName) ? eduPersonPrincipalName : sub;
        Instant epochStart = Instant.ofEpochMilli(0);
        return Map.of(
                //Defensive because of non-persisted users - only in tests
                "id", Objects.isNull(id) ? 0L : id,
                "name", StringUtils.hasText(name) ? name : notNullIdentifier,
                "email", notNullIdentifier,
                "createdAt", createdAt != null ? createdAt : epochStart,
                "lastActivity", lastActivity != null ? lastActivity : epochStart,
                "schacHomeOrganization", StringUtils.hasText(schacHomeOrganization) ? schacHomeOrganization : "Unknown schac",
                "sub", sub
        );
    }

    @JsonIgnore
    public boolean updateAttributes(Map<String, Object> attributes) {
        boolean changed = false;
        String newEdupersonPrincipalName = (String) attributes.get("eduperson_principal_name");
        changed = changed || !Objects.equals(this.eduPersonPrincipalName, newEdupersonPrincipalName);
        this.eduPersonPrincipalName = newEdupersonPrincipalName;

        String newSchacHomeOrganization = (String) attributes.get("schac_home_organization");
        changed = changed || !Objects.equals(this.schacHomeOrganization, newSchacHomeOrganization);
        this.schacHomeOrganization = newSchacHomeOrganization;

        String newGivenName = (String) attributes.get("given_name");
        changed = changed || !Objects.equals(this.givenName, newGivenName);
        this.givenName = newGivenName;

        String newFamilyName = (String) attributes.get("family_name");
        changed = changed || !Objects.equals(this.familyName, newFamilyName);
        this.familyName = newFamilyName;

        String newEmail = (String) attributes.get("email");
        changed = changed || !Objects.equals(this.email, newEmail);
        this.email = newEmail;

        String newSubjectId = (String) attributes.get("subject_id");
        changed = changed || !Objects.equals(this.subjectId, newSubjectId);
        this.subjectId = newSubjectId;

        this.lastActivity = Instant.now();

        String currentName = this.name;
        String currentGivenName = this.givenName;
        String currentFamilyName = this.familyName;

        this.nameInvariant(attributes);

        changed = changed || !Objects.equals(this.name, currentName) || !Objects.equals(this.givenName, currentGivenName)
                || !Objects.equals(this.familyName, currentFamilyName);

        return changed;
    }

}
