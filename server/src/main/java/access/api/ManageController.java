package access.api;

import access.exception.InvalidInputException;
import access.manage.MetaData;
import access.manage.MetaDataFeedParser;
import lombok.SneakyThrows;
import org.opensaml.saml.saml2.metadata.EntityDescriptor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.UrlResource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;

@RestController
public class ManageController {

    private final MetaDataFeedParser metaDataFeedParser = new MetaDataFeedParser();

    @SneakyThrows
    @PostMapping("/api/v1/manage/parse")
    public List<MetaData> parse(@RequestBody Map<String, String> requestBody) {
        List<EntityDescriptor> entityDescriptors;
        if (requestBody.containsKey("url")) {
            URL url = new URI(requestBody.get("url")).toURL();
            String protocol = url.getProtocol().toLowerCase();
            if (!List.of("http", "https").contains(protocol)) {
                throw new InvalidInputException("Not allowed protocol: " + protocol);
            }
            entityDescriptors = metaDataFeedParser.importXML(new UrlResource(url));
        } else {
            String xml = requestBody.get("xml");
            entityDescriptors = metaDataFeedParser.importXML(new ByteArrayResource(xml.getBytes(Charset.defaultCharset())));
        }
        return entityDescriptors.stream().map(MetaData::new).toList();
    }

}
