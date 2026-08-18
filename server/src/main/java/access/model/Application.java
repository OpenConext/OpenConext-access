package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.Hibernate;
import org.hibernate.annotations.Type;

import java.io.Serializable;
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
public class Application implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @Column(name = "logo_url")
    private String logoUrl;

    @Type(JsonType.class)
    @Column(name = "meta_data", columnDefinition = "jsonb")
    private HashMap<String, Object> metaData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ApplicationStatus status = ApplicationStatus.OPEN;

    @Column(name = "sections_complete")
    private int sectionsComplete;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Organization organization;

    @OneToMany(mappedBy = "application", orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<Connection> connections = new HashSet<>();

    @OneToMany(mappedBy = "application", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<ApplicationMembership> applicationMemberships = new HashSet<>();

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "created_by")
    private String createdBy;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ApplicationTarget target = ApplicationTarget.SURF;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ApplicationType type = ApplicationType.APP;


    public Application(String name, Organization organization, String createdBy, Map<String, Object> metaData) {
        this.name = name;
        this.organization = organization;
        this.metaData = new HashMap<>(metaData);
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    //We need organization info, but we don't want cyclic JSON deserialization
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "organization")
    public Map<String, Serializable> getOrganizationInfo() {
        Organization organization = getOrganization();
        Map<String, Serializable> organizationInfo = new HashMap<>();
        if (organization != null && Hibernate.isInitialized(organization)) {
            organizationInfo.put("id", organization.getId());
            organizationInfo.put("name", organization.getName());
            organizationInfo.put("schacHomeOrganization", organization.getSchacHomeOrganization());
        }
        return organizationInfo;
    }

    //We need info, about the owner
    @JsonProperty(access = JsonProperty.Access.READ_ONLY, value = "ownerIdentifier")
    public Long getOwnerInfo() {
        User appOwner = getOwner();
        if (appOwner != null && Hibernate.isInitialized(appOwner)) {
            return appOwner.getId();
        }
        return null;
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
        this.status = applicationData.status;
    }

}
