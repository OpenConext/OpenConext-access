package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static access.manage.ManageData.*;

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
    private HashMap<String, Object> metaData = new HashMap<>();

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

    @Column(name = "secret_set")
    private boolean secretSet;

    @Column(name = "manage_identifier")
    private String manageIdentifier;

    @Column(name = "manage_version")
    private Integer manageVersion;

    @Column(name = "manage_eid")
    private Integer manageEid;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Transient
    private List<Map<String, Object>> changeRequests = new ArrayList<>();

    public Connection(String name, Application application, Map<String, Object> metaData, EntityType protocol, Environment environment) {
        this.name = name;
        this.application = application;
        this.metaData = new HashMap<>(metaData);
        this.protocol = protocol;
        this.environment = environment;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.manageVersion = 0;
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
        if (this.protocol.equals(EntityType.oidc10_rp) &&
                (CollectionUtils.isEmpty((Collection<?>) metaData.get("redirectUrls")) ||
                        CollectionUtils.isEmpty((Collection<?>) metaData.get("grantTypes")))) {
            return false;
        }
        if (this.protocol.equals(EntityType.saml20_sp) &&
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


    @JsonIgnore
    public boolean mergeMetaData(Map<String, Object> provider, boolean force) {
        // For new Connections
        boolean changed = true;
        Integer newManageVersion = (Integer) provider.get("version");
        if (newManageVersion.equals(this.manageVersion) && !force) {
            //Two-way synchronization and optimistic locking
            return false;
        }
        this.manageIdentifier = (String) provider.get("id");
        this.manageVersion = newManageVersion;
        this.metaData = new HashMap<>();

        Map<String, Object> data = getData(provider);
        this.manageEid = (Integer) data.get("eid");

        String entityID = (String) data.get("entityid");
        this.metaData.put("entityID", entityID);
        this.metaData.put("allowedall", data.get("allowedall"));
        List<Map<String, String>> allowedEntities = (List<Map<String, String>>) data.getOrDefault("allowedEntities", List.of());
        List<String> allowedEntitiesMapped = allowedEntities.stream().map(m -> m.get("name")).toList();
        this.metaData.put("allowedEntities", allowedEntitiesMapped);
        Map<String, Object> arp = (Map<String, Object>) data.get("arp");
        this.metaData.put("arp", arp);

        Map<String, Object> metaDataFields = getMetaDataFields(data);
        this.name = (String) metaDataFields.getOrDefault("name:en", this.name);
        this.metaData.put("name", name);
        this.metaData.put("pkce", metaDataFields.get("isPublicClient"));
        this.metaData.put("grantTypes", metaDataFields.get("grants"));
        this.metaData.put("refreshTokenValidity", metaDataFields.get("refreshTokenValidity"));
        this.metaData.put("claimsInIdToken", metaDataFields.get("oidc:claims_in_id_token"));
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
        boolean ssHidden = (boolean) metaDataFields.getOrDefault("coin:ss:hidden", false);
        boolean idpVisibleOnly = (boolean) metaDataFields.getOrDefault("coin:ss:idp_visible_only", false);
        String visibility = ssHidden ? Visibility.visible_to_none.name() : idpVisibleOnly ?
                Visibility.visible_to_idp_only.name() : Visibility.visible_to_all.name();
        this.metaData.put("visibility", visibility);
        this.metaData.put("loginUrl", metaDataFields.get("coin:login_url"));
        String connectOption = (String) metaDataFields
                .getOrDefault("coin:dashboard_connect_option", ConnectOptions.connect_with_interaction.name());
        this.metaData.put("connectOption", connectOption);
        /*
         * Business logic. If a status for a production connection is pending production and the state has changed
         * to prodaccepted, then we set the status to production ready
         */
        this.state = State.valueOf((String) data.getOrDefault("state", "testaccepted"));
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
        this.state = State.valueOf((String) data.getOrDefault("state", "testaccepted"));
    }

    @JsonIgnore
    public boolean changeRequestRequired() {
        return this.environment.equals(Environment.PROD) &&
                this.status.equals(ConnectionStatus.PROD_READY);
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = Instant.now();
    }

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public List<Map<String, Object>> getChangeRequests() {
        return this.changeRequests;
    }

    public void convertChangeRequests(List<Map<String, Object>> changeRequests) {
        //We need to convert the changeRequests to the same data as the metaData of a Connection
        this.changeRequests = changeRequests.stream()
                .map(changeRequest -> {
                    Map<String, Object> pathUpdates = (Map<String, Object>) changeRequest.get("pathUpdates");
                    Map<String, Object> provider = new HashMap<>();
                    //To prevent NullPointerException
                    provider.put("version", -1);

                    Map<String, Object> data = new HashMap<>();
                    provider.put("data", data);

                    Map<String, Object> metaDataFields = new HashMap<>();
                    data.put("metaDataFields", metaDataFields);

                    pathUpdates.forEach((key, value) -> {
                        if (key.startsWith("metaDataFields")) {
                            //See src/test/resources/manage/change_request_large.json
                            key = key.substring("metaDataFields.".length());
                            metaDataFields.put(key, value);
                        } else {
                            //For pathUpdates to the ARP
                            data.put(key, value);
                        }
                    });
                    Connection connection = new Connection();
                    connection.mergeMetaData(provider, true);
                    Map<String, Object> connectionMetaData = connection.getMetaData();
                    //Now clean up all keys where the value is empty
                    connectionMetaData.entrySet().removeIf(entry -> isEmpty(entry.getValue()));
                    //Bugfix for lazy initialization of boolean values
                    Map.of(
                                    "visibility", List.of("coin:ss:idp_visible_only", "coin:ss:hidden"),
                                    "pkce", List.of("isPublicClient"),
                                    "oidc:claims_in_id_token", List.of("claimsInIdToken"),
                                    "connectOption", List.of("coin:dashboard_connect_option"))
                            .forEach((connectionKey, manageValues) -> {
                                if (manageValues.stream().noneMatch(val -> metaDataFields.containsKey(val))) {
                                    connectionMetaData.remove(connectionKey);
                                }
                            });
                    //copy some of the auditData for display purposes and revoke functionality
                    List.of("id", "metaDataId", "type", "auditData", "created")
                            .forEach(attr -> connectionMetaData.put(attr, changeRequest.get(attr)));
                    return connectionMetaData;
                })
                .toList();
    }

}
