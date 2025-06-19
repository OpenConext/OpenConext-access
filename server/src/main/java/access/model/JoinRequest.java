package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Entity(name = "join_requests")
@NoArgsConstructor
@Getter
@Setter
public class JoinRequest implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Language language;

    @Column
    private String message;

    @Column(name = "created_at")
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    @Transient
    private String transientName;

    public JoinRequest(User user, Organization organization, Language language) {
        this.user = user;
        this.organization = organization;
        this.language = language;
        this.createdAt = Instant.now();
        this.transientName = getClass().getName().concat(organization.getName()).concat(user.getName());
    }

    //We need organization info, but we don't want cyclic JSON deserialization
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "organization")
    public Map<String, Serializable> getOrganizationInfo() {
        Organization organization = getOrganization();
        Map<String, Serializable> organizationInfo = new HashMap<>();
        if (organization != null) {
            organizationInfo.put("id", organization.getId());
            organizationInfo.put("name", organization.getName());
        }
        return organizationInfo;
    }

    //We need user info, but we don't want cyclic JSON deserialization
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "user")
    public Map<String, Serializable> getUserInfo() {
        User user = getUser();
        Map<String, Serializable> userInfo = new HashMap<>();
        if (user != null) {
            userInfo.put("id", user.getId());
            userInfo.put("name", user.getName());
            userInfo.put("email", user.getEmail());
            userInfo.put("schacHomeOrganization", user.getSchacHomeOrganization());
        }
        return userInfo;
    }

    @Override
    @Transient
    @JsonIgnore
    public String getName() {
        return transientName;
    }
}
