package access.model;

import access.manage.Contact;
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
import java.util.*;
import java.util.stream.IntStream;

@Entity(name = "connections")
@NoArgsConstructor
@Getter
@Setter
@SuppressWarnings("unchecked")
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
    private Map<String, Object> metaData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private EntityType protocol = EntityType.oidc10_rp;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private Environment environment = Environment.TEST;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private State state = State.prodaccepted;

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private ConnectionStatus status = ConnectionStatus.OPEN;

    @Column(name = "manage_identifier")
    private String manageIdentifier;

    @Column(name = "manage_version")
    private Integer manageVersion;

    @Column(name = "manage_eid")
    private Integer manageEid;

    @Column(name = "created_at")
    private Instant createdAt;

    public Connection(String name, Application application, Map<String, Object> metaData, EntityType protocol, Environment environment) {
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
        String entityID = (String) metaData.get("entityID");
        if (!StringUtils.hasText(entityID) && EntityType.saml20_sp.equals(this.protocol)) {
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

    public boolean mergeMetaData(Map<String, Object> provider) {
        // For new Connections
        boolean changed = false;
        this.manageIdentifier = (String) provider.get("id");
        Integer newManageVersion = (Integer) provider.get("version");
        if (!newManageVersion.equals(this.manageVersion)) {
            //Two-way synchronization and optimistic locking
            changed = true;
        }
        this.manageVersion = newManageVersion;
        this.metaData = new HashMap<>();

        Map<String, Object> data = (Map<String, Object>) provider.get("data");
        this.manageEid = (Integer) data.get("eid");

        String entityID = (String) data.get("entityid");
        this.metaData.put("entityID", entityID);
        this.metaData.put("allowedall", data.get("allowedall"));
        List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data.getOrDefault("allowedEntities", List.of());
        List<String> allowedEntitiesMapped = allowedEntities.stream().map(m -> m.get("name")).toList();
        this.metaData.put("allowedEntities", allowedEntitiesMapped);
        this.metaData.put("arp", data.get("arp"));

        Map<String, Object> metaDataFields = (Map<String, Object>) data.get("metaDataFields");
        this.metaData.put("pkce", metaDataFields.get("isPublicClient"));
        this.metaData.put("grantTypes", metaDataFields.get("grants"));
        this.metaData.put("secret", metaDataFields.get("secret"));
        this.metaData.put("redirectUrls", metaDataFields.get("redirectUrls"));
        List<String> acsLocations = new ArrayList<>();
        IntStream.of(0, 1, 2, 3, 4, 5).forEach(index -> {
            if (metaDataFields.containsKey("AssertionConsumerService:" + index + ":Location")) {
                acsLocations.add((String) metaDataFields.get("AssertionConsumerService:" + index + ":Location"));
            }
        });
        this.metaData.put("acsLocations", acsLocations);
        this.metaData.put("logoUrl", metaDataFields.get("logo:0:url"));
        List<Contact> contactPersons = new ArrayList<>();
        IntStream.of(0, 1, 2, 3, 4, 5).forEach(index -> {
            if (metaDataFields.containsKey("contacts:" + index + ":emailAddress")) {
                Contact contact = new Contact(
                        (String) metaDataFields.get("contacts:" + index + ":contactType"),
                        (String) metaDataFields.get("contacts:" + index + ":givenName"),
                        (String) metaDataFields.get("contacts:" + index + ":surName"),
                        (String) metaDataFields.get("contacts:" + index + ":emailAddress")
                );
                contactPersons.add(contact);
            }
        });
        this.metaData.put("contactPersons", contactPersons);

        boolean ssHidden = (boolean) metaDataFields.getOrDefault("coin:ss:hidden", false);
        boolean idpVisibleOnly = (boolean) metaDataFields.getOrDefault("coin:ss:idp_visible_only", false);
        String visibility = ssHidden ? Visibility.visible_to_none.name() : idpVisibleOnly ?
                Visibility.visible_to_idp_only.name() : Visibility.visible_to_all.name();
        this.metaData.put("visibility", visibility);

        String connectOption = (String) metaDataFields
                .getOrDefault("coin:dashboard_connect_option", ConnectOptions.connect_with_interaction);
        this.metaData.put("connectOption", connectOption);
        /*
         * Business logic. If a status for a production connection is pending production and the state has changed
         * to prodaccepted, then we set the status to production ready
         */
        this.state = State.valueOf((String) data.get("state"));
        if (this.environment.equals(Environment.PROD) &&
                ConnectionStatus.PENDING_PROD.equals(this.status) &&
                this.state.equals(State.prodaccepted)) {
            this.status = ConnectionStatus.PROD_READY;
        }
        return changed;
    }

    @JsonIgnore
    public void updateRemoteManageData(Map<String, Object> provider) {
        this.manageIdentifier = (String) provider.get("id");
        this.manageVersion = (Integer) provider.get("version");
        Map<String, Object> data = (Map<String, Object>) provider.get("data");
        this.manageEid = (Integer) data.get("eid");
        this.state = State.valueOf((String) data.get("state"));
    }


}
