package access.manage;

import org.junit.jupiter.api.Test;
import org.opensaml.saml.saml2.metadata.AssertionConsumerService;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.opensaml.saml.saml2.metadata.RoleDescriptor;
import org.opensaml.saml.saml2.metadata.SPSSODescriptor;
import org.springframework.core.io.ClassPathResource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MetaDataFeedParserTest {

    private final MetaDataFeedParser metaDataFeedParser = new MetaDataFeedParser();

    @Test
    void importXML() {
        List<EntityDescriptor> entityDescriptors = metaDataFeedParser.importXML(new ClassPathResource("/metadata.xml"));
        assertEquals(1, entityDescriptors.size());

        EntityDescriptor entityDescriptor = entityDescriptors.getFirst();
        assertEquals("https://engine.test.surfconext.nl/authentication/sp/metadata", entityDescriptor.getEntityID());

        List<RoleDescriptor> roleDescriptors = entityDescriptor.getRoleDescriptors();
        assertEquals(1, roleDescriptors.size());

        SPSSODescriptor roleDescriptor = (SPSSODescriptor) roleDescriptors.getFirst();
        AssertionConsumerService assertionConsumerService = roleDescriptor.getAssertionConsumerServices().getFirst();
        String acsLocation = assertionConsumerService.getLocation();
        assertEquals("https://engine.test.surfconext.nl/authentication/sp/consume-assertion", acsLocation);

        MetaData metaData = new MetaData(entityDescriptor);
        assertEquals(entityDescriptor.getEntityID(), metaData.getEntityID());
        assertEquals("SURFconext TEST EngineBlock", metaData.getName());
        assertEquals("SURFconext TEST", metaData.getDescription());
        assertEquals(acsLocation, metaData.getAcsLocations().getFirst());
        assertEquals(3, metaData.getContactPersons().size());
    }

    @Test
    void importXMLDescriptors() {
        List<EntityDescriptor> entityDescriptors = metaDataFeedParser.importXML(new ClassPathResource("/idps-metadata.xml"));
        assertEquals(1, entityDescriptors.size());
    }

    @Test
    void importXMLAssertion() {
        assertThrows(IllegalStateException.class, () -> metaDataFeedParser.importXML(new ClassPathResource("/assertion.xml")));

    }
}