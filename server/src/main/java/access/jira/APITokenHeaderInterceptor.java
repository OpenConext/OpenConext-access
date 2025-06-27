package access.jira;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;

public class APITokenHeaderInterceptor implements ClientHttpRequestInterceptor {

    private final String apiTokenHeaderValue;

    public APITokenHeaderInterceptor(String apiToken) {
        this.apiTokenHeaderValue ="Bearer " + apiToken;
    }

    @Override
    public ClientHttpResponse intercept(
            HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {

        HttpHeaders headers = request.getHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, apiTokenHeaderValue);
        return execution.execute(request, body);
    }
}
