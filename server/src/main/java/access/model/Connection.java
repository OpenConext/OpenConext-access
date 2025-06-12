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
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

@Entity(name = "connections")
@NoArgsConstructor
@Getter
@Setter
public class Connection implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Application application;

    @Type(JsonType.class)
    @Column(name = "meta_data", columnDefinition = "jsonb")
    private Map<String, ?> metaData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Protocol protocol = Protocol.OIDC;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Environment environment = Environment.TEST;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Status status = Status.OPEN;

    @Column(name = "manage_identifier")
    private String manageIdentifier;

    @Column(name = "created_at")
    private Instant createdAt;

    public Connection(String name, Application application, Map<String, ?> metaData, Protocol protocol, Environment environment) {
        this.name = name;
        this.application = application;
        this.metaData = metaData;
        this.protocol = protocol;
        this.environment = environment;
        this.createdAt = Instant.now();
    }

    @JsonIgnore
    public boolean isValid() {
        if (!StringUtils.hasText(name)) {
            return false;
        }
        String entityid = (String) metaData.get("entityID");
        if (!StringUtils.hasText(entityid)) {
            return false;
        }
        String protocolName = this.protocol.name();
        if (protocolName.equals("OIDC") &&
                (CollectionUtils.isEmpty((Collection<?>) metaData.get("redirectUrls")) ||
                        CollectionUtils.isEmpty((Collection<?>) metaData.get("grantTypes")))) {
            return false;
        }
        if (protocolName.equals("SAML") &&
                CollectionUtils.isEmpty((Collection<?>) metaData.get("acsLocations"))) {
            return false;
        }
        return true;
    }

    public void merge(Connection connectionData) {
            this.name = connectionData.name;
            this.metaData = connectionData.metaData;
            this.protocol = connectionData.protocol;
            this.environment = connectionData.environment;
            this.status = connectionData.status;
    }
}
