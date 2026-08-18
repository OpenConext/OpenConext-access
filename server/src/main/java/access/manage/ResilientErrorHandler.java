package access.manage;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.nimbusds.jose.util.IOUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.DefaultResponseErrorHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

public class ResilientErrorHandler extends DefaultResponseErrorHandler {

    private final ObjectMapper objectMapper;

    public ResilientErrorHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }


    @Override
    public void handleError(URI url, HttpMethod method, ClientHttpResponse response) throws IOException {
        String responseBody = IOUtils.readInputStreamToString(response.getBody());
        Map<String, Object> errorMap = this.objectMapper.readValue(responseBody, new TypeReference<>() {
        });
        if (ignoreError(errorMap)) {
            //ignore this exception, as nothing is changed are wrong
            return;
        }
        super.handleError(url, method, response);

    }

    protected static boolean ignoreError(Map<String, Object> errorMap) {
        return errorMap.containsKey("validations") && ((String) errorMap.get("validations")).contains("No data is changed");
    }

}

