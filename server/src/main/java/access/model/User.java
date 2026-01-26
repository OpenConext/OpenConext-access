package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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

import static access.security.InstitutionAdmin.*;


@Entity(name = "users")
@NoArgsConstructor
@Getter
@Setter
@SuppressWarnings("unchecked")
public class User implements Serializable, NameHolder {

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

    @Column(name = "authenticating_authority")
    private String authenticatingAuthority;

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

    @Transient
    private Institution institution = null;

    @Transient
    private Map<String, Object> identityProvider = null;

    @Transient
    private List<Map<String, Object>> changeRequests = null;

    @Transient
    private int loaLevel = 1;

    @Transient
    private boolean externalUser;

    public User(Map<String, Object> attributes) {
        this(false, attributes);
    }

    public User(boolean superUser, Map<String, Object> attributes) {
        this.superUser = superUser;
        this.sub = (String) attributes.get("sub");
        this.eduPersonPrincipalName = (String) attributes.get("eduperson_principal_name");
        this.schacHomeOrganization = (String) attributes.get("schac_home_organization");
        this.authenticatingAuthority = (String) attributes.get("authenticating_authority");
        this.email = (String) attributes.get("email");
        this.givenName = (String) attributes.get("given_name");
        this.familyName = (String) attributes.get("family_name");
        this.subjectId = (String) attributes.get("subject_id");
        this.eduId = (String) attributes.get("eduid");
        this.uid = ((List<String>) attributes.getOrDefault("uids", List.of())).stream().findAny().orElse(null);
        this.createdAt = Instant.now();
        this.lastActivity = this.createdAt;
        this.institutionAdmin = (boolean) attributes.getOrDefault(INSTITUTION_ADMIN, false);
        this.organizationGUID = (String) attributes.get(ORGANIZATION_GUID);
        this.institution = (Institution) attributes.get(INSTITUTION);

        //Defensive mode, EPPN is not a required attribute for access RP
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
    public void updateAttributes(Map<String, Object> attributes) {
        this.eduPersonPrincipalName = (String) attributes.get("eduperson_principal_name");
        this.schacHomeOrganization = (String) attributes.get("schac_home_organization");
        this.givenName = (String) attributes.get("given_name");
        this.familyName = (String) attributes.get("family_name");
        this.authenticatingAuthority = (String) attributes.get("authenticating_authority");
        this.email = (String) attributes.get("email");
        this.subjectId = (String) attributes.get("subject_id");
        this.institutionAdmin = (boolean) attributes.getOrDefault(INSTITUTION_ADMIN, false);
        this.organizationGUID = (String) attributes.get(ORGANIZATION_GUID);
        this.eduId = (String) attributes.get("eduid");
        this.lastActivity = Instant.now();

        this.nameInvariant(attributes);

        //Defensive mode, EPPN is not a required attribute for access RP
        if (!StringUtils.hasText(this.eduPersonPrincipalName)) {
            this.eduPersonPrincipalName = this.email;
        }
    }

    @JsonIgnore
    public OrganizationMembership addOrganizationMembership(OrganizationMembership organizationMembership) {
        this.organizationMemberships.add(organizationMembership);
        organizationMembership.setUser(this);
        return organizationMembership;
    }

    @JsonProperty
    public Institution getInstitution() {
        return institution;
    }

    @JsonProperty
    public Map<String, Object> getIdentityProvider() {
        return identityProvider;
    }

    @JsonProperty
    public int getLoaLevel() {
        return loaLevel;
    }

    @JsonProperty
    public boolean isExternalUser() {
        return externalUser;
    }

    @JsonProperty
    public List<Map<String, Object>> getChangeRequests() {
        return changeRequests;
    }
}
