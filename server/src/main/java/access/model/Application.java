package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Entity(name = "applications")
@NoArgsConstructor
@Getter
@Setter
public class Application implements NameHolder{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @Column(name = "logo_url")
    private String logoUrl;

    @Type(JsonType.class)
    @Column(name="meta_data", columnDefinition = "jsonb")
    private Map<String, Object> metaData = new HashMap<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    @OneToMany(mappedBy = "application", orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<Connection> connections = new HashSet<>();

    @OneToMany(mappedBy = "application", orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<ApplicationMembership> applicationMemberships = new HashSet<>();

    @Column(name = "created_at")
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ApplicationTarget target = ApplicationTarget.SURF;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ApplicationType type = ApplicationType.APP;

    public Application(String name, Organization organization, Map<String, Object> metaData) {
        this.name = name;
        this.organization = organization;
        this.metaData = metaData;
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

    @JsonIgnore
    public void removeConnection(Connection connection) {
        //This is required by Hibernate - children can't be dereferenced
        Set<Connection> newConnections = this.connections
                .stream().filter(conn -> !conn.getId().equals(connection.getId())).collect(Collectors.toSet());
        this.connections.clear();
        this.connections.addAll(newConnections);
    }

    public void merge(Application applicationData) {
        this.name = applicationData.name;
        this.metaData = applicationData.metaData;
        this.type = applicationData.type;
        this.target = applicationData.target;
        this.logoUrl = applicationData.logoUrl;
    }
}
