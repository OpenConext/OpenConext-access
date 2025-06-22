package access.manage;


import access.model.Environment;
import access.model.State;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class ManageConf {

    @Bean
    public Manage manage(@Value("${manage.test.url}") String testUrl,
                         @Value("${manage.test.user}") String testUser,
                         @Value("${manage.test.password}") String testPassword,
                         @Value("${manage.prod.url}") String prodUrl,
                         @Value("${manage.prod.user}") String prodUser,
                         @Value("${manage.prod.password}") String prodPassword,
                         @Value("${manage.enabled}") boolean enabled,
                         @Value("${manage.staticManageDirectory}") String staticManageDirectory,
                         ConnectionProviderConverter converter,
                         ObjectMapper objectMapper) throws IOException {
        ManageAuthorization testAuthorization = new ManageAuthorization(testUrl, testUser, testPassword, Environment.TEST);
        ManageAuthorization prodAuthorization = new ManageAuthorization(prodUrl, prodUser, prodPassword, Environment.PROD);
        return enabled ? new RemoteManage(testAuthorization, prodAuthorization, converter, objectMapper) :
                new LocalManage(converter, objectMapper, staticManageDirectory);
    }

    @Bean
    public ConnectionProviderConverter connectionProviderConverter(
            @Value("${manage.test.defaultState}") State defaultTestState,
            @Value("${manage.prod.defaultState}") State defaultProdState,
            ObjectMapper objectMapper) {
        return new ConnectionProviderConverter(objectMapper, defaultTestState, defaultProdState);
    }

}
