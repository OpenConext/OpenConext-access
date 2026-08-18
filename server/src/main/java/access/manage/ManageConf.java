package access.manage;


import access.config.Config;
import access.model.State;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class ManageConf {

    @Bean
    public Manage manage(@Value("${manage.url}") String url,
                         @Value("${manage.user}") String user,
                         @Value("${manage.password}") String password,
                         @Value("${manage.enabled}") boolean enabled,
                         @Value("${manage.staticManageDirectory}") String staticManageDirectory,
                         ConnectionProviderConverter converter,
                         ObjectMapper objectMapper,
                         Config config) throws IOException {
        ManageAuthorization authorization = new ManageAuthorization(url, user, password);
        return enabled ? new RemoteManage(authorization, converter, objectMapper, config) :
                new LocalManage(converter, objectMapper, staticManageDirectory);
    }

    @Bean
    public ConnectionProviderConverter connectionProviderConverter(
            @Value("${manage.defaultState}") State defaultState,
            ObjectMapper objectMapper) {
        return new ConnectionProviderConverter(objectMapper, defaultState);
    }

}
