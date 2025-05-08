package access.model;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.io.Serializable;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

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
    private Organization organization;

    @Type(JsonType.class)
    @Column(name="meta_data", columnDefinition = "jsonb")
    private Map<String, ?> metaData = new HashMap<>();

    @Column(name = "created_at")
    private Instant createdAt;

    public Application(String name, Organization organization, Map<String, ?> metaData) {
        this.name = name;
        this.organization = organization;
        this.metaData = metaData;
        this.createdAt = Instant.now();
    }
}
