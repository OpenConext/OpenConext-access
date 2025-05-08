package access.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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

    @Column(name = "created_at")
    private Instant createdAt;

    public Organization(String name, String schacHomeOrganization) {
        this.name = name;
        this.schacHomeOrganization = schacHomeOrganization;
        this.createdAt = Instant.now();
    }
}
