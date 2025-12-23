package access.remote;

import access.manage.JSONHeaderInterceptor;
import access.manage.ManageAuthorization;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.client.support.BasicAuthenticationInterceptor;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.util.List;

public class RestTemplateFactory {

    private RestTemplateFactory() {
    }

    public static RestTemplate buildRrestTemplate(String user, String password) {
        return buildRrestTemplate(new DefaultResponseErrorHandler(), user, password);
    }

    public static RestTemplate buildRrestTemplate(ResponseErrorHandler resilientErrorHandler, String user, String password) {
        HttpClientBuilder httpClientBuilder = HttpClientBuilder.create()
                .setConnectionManager(new PoolingHttpClientConnectionManager())
                .disableCookieManagement();

        CloseableHttpClient httpClient = httpClientBuilder.build();

        HttpComponentsClientHttpRequestFactory requestFactory =
                new HttpComponentsClientHttpRequestFactory(httpClient);
        // Set timeouts (in milliseconds)
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(15_000);

        RestTemplateBuilder builder = new RestTemplateBuilder();
        return builder
                .requestFactory(() -> new BufferingClientHttpRequestFactory(requestFactory))
                .additionalInterceptors(List.of(
                        new BasicAuthenticationInterceptor(user, password),
                        new JSONHeaderInterceptor()))
                .errorHandler(resilientErrorHandler)
                .build();
    }

}
