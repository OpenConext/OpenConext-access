package access.model;

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
import java.util.Map;

@Entity(name = "connections")
@NoArgsConstructor
@Getter
@Setter
public class Connection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private Application application;

    @Type(JsonType.class)
    @Column(name="meta_data", columnDefinition = "jsonb")
    private Map<String, ?> metaData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Protocol protocol;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Environment environment;

    @Column(name = "manage_identifier")
    @NotNull
    private String manageIdentifier;

    @Column(name = "created_at")
    private Instant createdAt;

    public Connection(Application application, Map<String, ?> metaData, Protocol protocol, Environment environment) {
        this.application = application;
        this.metaData = metaData;
        this.protocol = protocol;
        this.environment = environment;
        this.createdAt = Instant.now();
    }
}
