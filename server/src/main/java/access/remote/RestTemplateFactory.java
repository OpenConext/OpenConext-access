package access.remote;

import access.manage.BearerTokenInterceptor;
import access.manage.JSONHeaderInterceptor;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.util.Timeout;
import org.springframework.boot.restclient.RestTemplateBuilder;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.client.support.BasicAuthenticationInterceptor;
import org.springframework.util.StringUtils;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

public class RestTemplateFactory {

    private RestTemplateFactory() {
    }

    public static RestTemplate buildRestTemplate(String bearerToken) {
        return buildRestTemplate(new DefaultResponseErrorHandler(), null, null, bearerToken);
    }

    public static RestTemplate buildRestTemplate(String user, String password) {
        return buildRestTemplate(new DefaultResponseErrorHandler(), user, password, null);
    }

    public static RestTemplate buildRestTemplate(ResponseErrorHandler resilientErrorHandler, String user, String password, String bearerToken) {
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        // Configure connection timeout on the connection manager
        ConnectionConfig connectionConfig = ConnectionConfig.custom()
                .setConnectTimeout(Timeout.ofMilliseconds(10_000))
                .build();
        connectionManager.setDefaultConnectionConfig(connectionConfig);

        // Configure read timeout (socket timeout) on the request config
        RequestConfig requestConfig = RequestConfig.custom()
                .setResponseTimeout(Timeout.ofMilliseconds(15_000))
                .build();

        HttpClientBuilder httpClientBuilder = HttpClientBuilder.create()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .disableCookieManagement();

        CloseableHttpClient httpClient = httpClientBuilder.build();

        HttpComponentsClientHttpRequestFactory requestFactory =
                new HttpComponentsClientHttpRequestFactory(httpClient);

        RestTemplateBuilder builder = new RestTemplateBuilder();
        List<ClientHttpRequestInterceptor> interceptors = new ArrayList<>();
        interceptors.add(new JSONHeaderInterceptor());
        if (StringUtils.hasText(password)) {
            interceptors.add(new BasicAuthenticationInterceptor(user, password));
        } else if (StringUtils.hasText(bearerToken)) {
            interceptors.add(new BearerTokenInterceptor(bearerToken));
        }
        return builder
                .requestFactory(() -> new BufferingClientHttpRequestFactory(requestFactory))
                .additionalInterceptors(interceptors)
                .errorHandler(resilientErrorHandler)
                .build();
    }

}
