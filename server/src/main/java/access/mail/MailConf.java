package access.mail;

import access.config.Config;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.IOException;

@Configuration
@EnableConfigurationProperties(Config.class)
public class MailConf {

    @Bean
    public MailBox mailBox(Config config,
                           @Value("${email.from}") String emailFrom,
                           @Value("${email.serviceDeskEmail}") String serviceDeskEmail,
                           @Value("${email.environment}") String env,
                           JavaMailSender mailSender,
                           ObjectMapper objectMapper) throws IOException {
        return new MailBox(mailSender, emailFrom, serviceDeskEmail, config.getClientUrl(), env, objectMapper);
    }


}
