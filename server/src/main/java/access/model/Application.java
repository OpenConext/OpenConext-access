package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity(name = "applications")
@NoArgsConstructor
@Getter
@Setter
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    @OneToMany(mappedBy = "application", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Connection> connections = new HashSet<>();

    @OneToMany(mappedBy = "application", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<ApplicationMembership> applicationMemberships = new HashSet<>();

    @Column(name = "created_at")
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ApplicationType type = ApplicationType.SURF;

    public Application(String name, Organization organization, Set<Connection> connections, ApplicationType type) {
        this.name = name;
        this.organization = organization;
        this.connections = connections;
        this.type = type;
        this.createdAt = Instant.now();
    }

    @JsonIgnore
    public ApplicationMembership addApplicationMembership(ApplicationMembership applicationMembership) {
        this.applicationMemberships.add(applicationMembership);
        applicationMembership.setApplication(this);
        return applicationMembership;
    }

    @JsonIgnore
    public void removeApplicationMembership(ApplicationMembership applicationMembership) {
        //This is required by Hibernate - children can't be dereferenced
        Set<ApplicationMembership> newApplicationMemberships = this.applicationMemberships
                .stream().filter(am -> !am.getId().equals(applicationMembership.getId())).collect(Collectors.toSet());
        this.applicationMemberships.clear();
        this.applicationMemberships.addAll(newApplicationMemberships);
    }

}
