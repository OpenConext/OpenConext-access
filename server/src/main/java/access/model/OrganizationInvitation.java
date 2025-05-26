package access.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "organization_invitations")
@NoArgsConstructor
@Getter
@Setter
public class OrganizationInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Language language;

    @Column
    @NotNull
    private String hash;

    @Column
    @NotNull
    private String email;

    @Column
    private String message;

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

}
