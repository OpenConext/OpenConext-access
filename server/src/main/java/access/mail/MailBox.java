package access.mail;

import access.model.Authority;
import access.model.Language;
import access.model.OrganizationInvitation;
import access.model.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.MustacheFactory;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.SneakyThrows;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@SuppressWarnings("unchecked")
public class MailBox {

    private final JavaMailSender mailSender;
    private final String clientUrl;
    private final String emailFrom;
    private final String contactEmail;
    private final String environment;

    private final Map<String, Map<String, String>> subjects;

    private final MustacheFactory mustacheFactory = new DefaultMustacheFactory("templates");

    public MailBox(
            JavaMailSender mailSender,
            String emailFrom,
            String contactEmail,
            String clientUrl,
            String environment, ObjectMapper objectMapper) throws IOException {
        this.mailSender = mailSender;
        this.emailFrom = emailFrom;
        this.contactEmail = contactEmail;
        this.clientUrl = clientUrl;
        this.environment = environment;
        this.subjects = objectMapper.readValue(new ClassPathResource("/templates/subjects.json").getInputStream(), new TypeReference<>() {
        });
    }

    @SneakyThrows
    public void sendInviteMail(OrganizationInvitation invitation) {
        Authority intendedAuthority = invitation.getIntendedAuthority();
        Language language = invitation.getLanguage();
        String title = String.format(subjects.get(language.name()).get("newInvitation"),
                invitation.getOrganization().getName());
        Map<String, Object> variables = new HashMap<>();
        variables.put("invitation", invitation);
        variables.put("title", title);
        if (StringUtils.hasText(invitation.getMessage())) {
            variables.put("message", invitation.getMessage().replaceAll("\n", "<br/>"));
        }
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        variables.put("url", String.format("%s/invitation/accept?hash=%s", clientUrl, invitation.getHash()));

        sendMail(String.format("invitation_%s", language.name()),
                title,
                variables,
                invitation.getEmail());
    }

    private String preferredLanguage() {
        return LocaleContextHolder.getLocale().getLanguage();
    }

    private String sendMail(String templateName, String subject, Map<String, Object> variables, String... to) throws MessagingException, IOException {
        String htmlText = this.mailTemplate(templateName + ".html", variables);
        String plainText = this.mailTemplate(templateName + ".txt", variables);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setSubject(subject);
        helper.setText(plainText, htmlText);
        helper.setTo(to);
        helper.setFrom(emailFrom);
        new Thread(() -> mailSender.send(message)).start();
        return htmlText;
    }

    private String mailTemplate(String templateName, Map<String, Object> context) {
        return mustacheFactory.compile(templateName).execute(new StringWriter(), context).toString();
    }


}
