package access.manage;

import lombok.Getter;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.opensaml.saml.saml2.metadata.RoleDescriptor;
import org.opensaml.saml.saml2.metadata.SPSSODescriptor;

import java.io.Serializable;
import java.util.List;
import java.util.Optional;

@Getter
public class MetaData implements Serializable {

    private final String entityID;
    private final String name;
    private final List<String> acsLocations;
    private final List<Contact> contactPersons;
    private final String description;

    public MetaData(EntityDescriptor entityDescriptor) {
        this.entityID = entityDescriptor.getEntityID();
        List<RoleDescriptor> roleDescriptors = entityDescriptor.getRoleDescriptors();
        SPSSODescriptor roleDescriptor = (SPSSODescriptor) roleDescriptors.getFirst();
        this.acsLocations = roleDescriptor.getAssertionConsumerServices().stream()
                .map(assertionConsumerService -> assertionConsumerService.getLocation()).toList();
        this.contactPersons = entityDescriptor.getContactPersons().stream().map(Contact::new).toList();
        Optional<String> names = roleDescriptor.getAttributeConsumingServices().stream()
                .map(attributeConsumingService -> attributeConsumingService.getNames())
                .flatMap(x -> x.stream())
                .map(serviceName -> serviceName.getValue())
                .findFirst();
        this.name = names.orElse(null);
        Optional<String> descriptions = roleDescriptor.getAttributeConsumingServices().stream()
                .map(attributeConsumingService -> attributeConsumingService.getDescriptions())
                .flatMap(x -> x.stream())
                .map(serviceDescription -> serviceDescription.getValue())
                .findFirst();
        this.description = descriptions.orElse(null);
    }
}
