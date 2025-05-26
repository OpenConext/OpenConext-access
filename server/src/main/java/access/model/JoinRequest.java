package access.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;

@Entity(name = "join_requests")
@NoArgsConstructor
@Getter
@Setter
public class JoinRequest {

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

    public JoinRequest(User user, Organization organization, Language language) {
        this.user = user;
        this.organization = organization;
        this.language = language;
        this.createdAt = Instant.now();
    }

    //We need organization name and user info, but we don't want cyclic JSON deserialization
    public Map<String, Object> getContext() {
        return Map.of(
                "organization", getOrganization().getName(),
                "user", Map.of(
                        "name", user.getName(),
                        "email", user.getEmail()
                ));
    }

}
