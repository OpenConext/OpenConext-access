package access.model;

import access.manage.Contact;
import access.manage.PathUpdateType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.Type;
import org.springframework.util.CollectionUtils;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static access.manage.ManageData.*;

@Entity(name = "organizations")
@NoArgsConstructor
@Getter
@Setter
public class Organization implements NameHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String name;

    @Column(name = "schac_home_organization")
    private String schacHomeOrganization;

    @Column(name = "manage_identifier")
    private String manageIdentifier;

    @Column(name = "manage_version")
    private Integer manageVersion;

    @Column(name = "ticket_key")
    private String ticketKey;

    @Column(name = "created_at")
    private Instant createdAt;

    @Transient
    private Map<String, Object> metaData = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column
    @NotNull
    private OrganizationStatus status = OrganizationStatus.PENDING_APPROVAL;

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Application> applications = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<OrganizationMembership> organizationMemberships = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<JoinRequest> joinRequests = new HashSet<>();

    @OneToMany(mappedBy = "organization", orphanRemoval = true, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Invitation> invitations = new HashSet<>();

    @Formula(value = "(SELECT COUNT(*) FROM organization_memberships om WHERE om.organization_id=id)")
    private Long memberCount;

    @Formula(value = "(SELECT COUNT(*) FROM applications a WHERE a.organization_id=id)")
    private Long applicationCount;

    @Transient
    private List<Map<String, Object>> changeRequests;

    public Organization(String name, String schacHomeOrganization) {
        this.name = name;
        this.schacHomeOrganization = schacHomeOrganization;
        this.createdAt = Instant.now();
    }

    public Organization(String name, String schacHomeOrganization, String manageIdentifier, Integer manageVersion) {
        this.name = name;
        this.schacHomeOrganization = schacHomeOrganization;
        this.manageIdentifier = manageIdentifier;
        this.manageVersion = manageVersion;
        this.createdAt = Instant.now();
    }

    @JsonIgnore
    public OrganizationMembership addOrganizationMembership(OrganizationMembership organizationMembership) {
        this.organizationMemberships.add(organizationMembership);
        organizationMembership.setOrganization(this);
        return organizationMembership;
    }

    @JsonIgnore
    public void removeApplication(Application application) {
        //This is required by Hibernate - children can't be dereferenced
        Set<Application> newApplications = this.applications
                .stream().filter(app -> !app.getId().equals(application.getId())).collect(Collectors.toSet());
        this.applications.clear();
        this.applications.addAll(newApplications);
    }

    @JsonIgnore
    public void removeJoinRequest(JoinRequest joinRequest) {
        //This is required by Hibernate - children can't be dereferenced
        Set<JoinRequest> newJoinRequests = this.joinRequests
                .stream().filter(jr -> !jr.getId().equals(joinRequest.getId())).collect(Collectors.toSet());
        this.joinRequests.clear();
        this.joinRequests.addAll(newJoinRequests);
    }

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public List<Map<String, Object>> getChangeRequests() {
        return this.changeRequests;
    }

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public Map<String, Object> getMetaData() {
        return metaData;
    }

    @JsonIgnore
    public boolean mergeMetaData(Map<String, Object> provider, boolean force) {
        // For new Connections
        Integer newManageVersion = (Integer) provider.get("version");
        if (newManageVersion.equals(this.manageVersion) && !force && !CollectionUtils.isEmpty(this.metaData)) {
            //Two-way synchronization and optimistic locking
            return false;
        }
        this.manageIdentifier = (String) provider.get("id");
        this.manageVersion = newManageVersion;
        this.metaData = new HashMap<>();

        Map<String, Object> data = getData(provider);

        String entityID = (String) data.get("entityid");
        this.metaData.put("entityID", entityID);
        String state = (String) data.get("state");
        this.metaData.put("state", state);

        this.metaData.put("allowedall", data.get("allowedall"));
        List.of("allowedEntities", "disableConsent", "stepupEntities", "mfaEntities")
                .forEach(key -> {
                    this.metaData.put(key, data.getOrDefault(key, List.of()));
                });

        Map<String, Object> metaDataFields = getMetaDataFields(data);
        this.name = (String) metaDataFields.getOrDefault("name:en", this.name);
        this.metaData.put("name", name);
        this.metaData.put("logoUrl", metaDataFields.get("logo:0:url"));
        String allKeyWords = (String) metaDataFields.getOrDefault("keywords:0:nl","") +
                metaDataFields.getOrDefault("keywords:0:en","");
        Set<String> keyWords = Arrays.stream(allKeyWords.split(" ")).map(String::trim).collect(Collectors.toSet());
        this.metaData.put("keyWords", keyWords);
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
        return true;
    }

    @SuppressWarnings("unchecked")
    public void convertChangeRequests(List<Map<String, Object>> changeRequests) {
        //We don't convert the changeRequests to the same data as the metaData of an Organization as this proves
        //to be too difficult. We sort it out on the client
        this.changeRequests = changeRequests;
//        this.changeRequests = changeRequests.stream()
//                .map(changeRequest -> {
//                    Map<String, Object> pathUpdates = (Map<String, Object>) changeRequest.get("pathUpdates");
//                    Map<String, Object> provider = new HashMap<>();
//                    //To prevent NullPointerException
//                    provider.put("version", -1);
//
//                    Map<String, Object> data = new HashMap<>();
//                    provider.put("data", data);
//
//                    Map<String, Object> metaDataFields = new HashMap<>();
//                    data.put("metaDataFields", metaDataFields);
//
//                    pathUpdates.forEach((key, value) -> {
//                        if (key.startsWith("metaDataFields")) {
//                            //See src/test/resources/manage/change_request_large.json
//                            key = key.substring("metaDataFields.".length());
//                            metaDataFields.put(key, value);
//                        } else {
//                            //For pathUpdates to the stepupEntities, mfaEntities, disableConsent
//                            String pathUpdateType = (String) changeRequest.get("pathUpdateType");
//                            if (pathUpdateType == null) {
//                                data.put(key, value);
//                            } else {
//                                //For incremental changes, we need the current value from the metaData and apply the change
//                                Object originalValue = this.metaData.get(key);
//                                if (originalValue instanceof List originalValueList) {
//                                    if (pathUpdateType.equals(PathUpdateType.ADDITION.name())) {
//                                        List newValue = new ArrayList(originalValueList);
//                                        if (value instanceof Map) {
//                                            newValue.add(value);
//                                        } else if (value instanceof List listValue) {
//                                            newValue.addAll(listValue);
//                                        }
//                                        data.put(key, newValue);
//                                    } else {
//                                        List<String> removedNames = value instanceof Map ? List.of((String) ((Map) value).get("name")) :
//                                                ((List) value).stream().map(m -> ((Map) m).get("name")).toList();
//                                        List newValue = originalValueList.stream()
//                                                .filter(m -> !removedNames.contains(((Map) m).get("name")))
//                                                .toList();
//                                        data.put(key, newValue);
//                                    }
//                                } else {
//                                    data.put(key, value);
//                                }
//                            }
//                        }
//                    });
//                    Organization organization = new Organization();
//                    organization.mergeMetaData(provider, true);
//                    Map<String, Object> connectionMetaData = organization.getMetaData();
//                    //Now clean up all keys where the value is empty
//                    connectionMetaData.entrySet().removeIf(entry -> isEmpty(entry.getValue()));
//                    //copy some of the auditData for display purposes and revoke functionality
//                    List.of("id", "metaDataId", "type", "auditData", "created")
//                            .forEach(attr -> connectionMetaData.put(attr, changeRequest.get(attr)));
//                    return connectionMetaData;
//                })
//                .toList();
    }


}
