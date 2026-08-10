package access.manage;

import lombok.SneakyThrows;
import org.opensaml.core.config.InitializationException;
import org.opensaml.core.config.InitializationService;
import org.opensaml.core.xml.XMLObject;
import org.opensaml.core.xml.config.XMLObjectProviderRegistrySupport;
import org.opensaml.core.xml.io.Unmarshaller;
import org.opensaml.core.xml.io.UnmarshallerFactory;
import org.opensaml.saml.saml2.metadata.EntitiesDescriptor;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.springframework.core.io.Resource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.util.List;

@SuppressWarnings("unchecked")
public class MetaDataFeedParser {

    static {
        try {
            InitializationService.initialize();
        } catch (InitializationException e) {
            throw new RuntimeException(e);
        }
    }

    @SneakyThrows
    public List<EntityDescriptor> importXML(Resource xml) {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);

        // Prevent XXE (CWE-611) and XXE-triggered SSRF (CWE-918)
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);

        DocumentBuilder builder = factory.newDocumentBuilder();
        Document document = builder.parse(xml.getInputStream());
        Element element = document.getDocumentElement();

        UnmarshallerFactory unmarshallerFactory = XMLObjectProviderRegistrySupport.getUnmarshallerFactory();
        Unmarshaller unmarshaller = unmarshallerFactory.getUnmarshaller(element);
        XMLObject xmlObject = unmarshaller.unmarshall(element);

        if (xmlObject instanceof EntityDescriptor entityDescriptor) {
            return List.of(entityDescriptor);
        } else if (xmlObject instanceof EntitiesDescriptor entityDescriptors) {
            return entityDescriptors.getEntityDescriptors();
        } else {
            throw new IllegalStateException("Unknown metadata type: " + xmlObject.getElementQName());
        }
    }

}