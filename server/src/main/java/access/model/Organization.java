package access.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;

import java.time.Instant;

@Entity(name = "organizations")
@NoArgsConstructor
@Getter
@Setter
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @Column(name = "schac_home_organization")
    private String schacHomeOrganization;

    @Column(name = "invite_role_name")
    private String inviteRoleName;

    @Column(name = "created_at")
    private Instant createdAt;

    @Formula(value = "(SELECT COUNT(*) FROM organization_memberships om WHERE om.organization_id=id)")
    private Long userCount;

    public Organization(String name, String schacHomeOrganization, String inviteRoleName) {
        this.name = name;
        this.schacHomeOrganization = schacHomeOrganization;
        this.inviteRoleName = inviteRoleName;
        this.createdAt = Instant.now();
    }
}
