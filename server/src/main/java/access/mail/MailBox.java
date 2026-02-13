package access.mail;

import access.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.MustacheFactory;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.SneakyThrows;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.StringWriter;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
public class MailBox {

    private final JavaMailSender mailSender;
    private final String clientUrl;
    private final String emailFrom;
    private final String serviceDeskEmail;
    private final String supportEmail;
    private final String environment;

    private final Map<String, Map<String, String>> subjects;

    private final MustacheFactory mustacheFactory = new DefaultMustacheFactory("templates");

    public MailBox(
            JavaMailSender mailSender,
            String emailFrom,
            String serviceDeskEmail,
            String supportEmail,
            String clientUrl,
            String environment, ObjectMapper objectMapper) throws IOException {
        this.mailSender = mailSender;
        this.emailFrom = emailFrom;
        this.serviceDeskEmail = serviceDeskEmail;
        this.supportEmail = supportEmail;
        this.clientUrl = clientUrl;
        this.environment = environment;
        this.subjects = objectMapper.readValue(new ClassPathResource("/templates/subjects.json").getInputStream(), new TypeReference<>() {
        });
    }

    @SneakyThrows
    public void sendInviteMail(Invitation invitation) {
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
        variables.put("url", String.format("%s/accept?hash=%s", clientUrl, invitation.getHash()));

        sendMail(String.format("invitation_%s", language.name()),
                title,
                variables,
                invitation.getEmail());
    }

    @SneakyThrows
    public void sendConnectionRequest(User requester,
                                      List<User> recipients,
                                      Organization organization,
                                      String serviceProviderName,
                                      String message,
                                      String deepLink) {
        Language language = Language.valueOf(preferredLanguage());
        String title = String.format(subjects.get(language.name()).get("connectionRequest"),
                serviceProviderName);
        Map<String, Object> variables = new HashMap<>();
        if (StringUtils.hasText(message)) {
            variables.put("message", message.replaceAll("\n", "<br/>"));
        }
        variables.put("title", title);
        variables.put("serviceProviderName", serviceProviderName);
        variables.put("organization", organization);
        variables.put("requester", requester);
        variables.put("deepLink", String.format("%s%s", clientUrl, deepLink));
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        sendMail(String.format("connection_request_%s", language.name()),
                title,
                variables,
                recipients.stream().map(user -> user.getEmail()).toList().toArray(new String[]{}));
    }

    @SneakyThrows
    public void sendNewConnectionCreated(User institutionAdmin,
                                         List<String> recipients,
                                         String identityProviderName,
                                         String serviceProviderName,
                                         String serviceProviderEntityId) {
        Language language = Language.valueOf(preferredLanguage());
        String title = String.format(subjects.get(language.name()).get("newConnectionMade"),
                serviceProviderName,
                identityProviderName);
        Map<String, Object> variables = new HashMap<>();
        variables.put("title", title);
        variables.put("identityProviderName", identityProviderName);
        variables.put("serviceProviderName", serviceProviderName);
        variables.put("serviceProviderEntityId", serviceProviderEntityId);
        variables.put("institutionAdmin", institutionAdmin);
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        sendMail(String.format("new_connection_made_%s", language.name()),
                title,
                variables,
                recipients.toArray(new String[]{}));
    }

    @SneakyThrows
    public void sendJoinRequestMail(JoinRequest joinRequest) {
        Language language = joinRequest.getLanguage();
        Organization organization = joinRequest.getOrganization();
        String title = String.format(subjects.get(language.name()).get("newJoinRequest"),
                joinRequest.getUser().getName(), organization.getName());
        Map<String, Object> variables = new HashMap<>();
        variables.put("joinRequest", joinRequest);
        variables.put("title", title);
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }

        variables.put("url", String.format("%s/users/%s/joins", clientUrl, organization.getId()));
        List<String> emails = organization.getOrganizationMemberships().stream()
                .filter(organizationMembership -> organizationMembership.getAuthority().equals(Authority.ADMIN))
                .map(organizationMembership -> organizationMembership.getUser().getEmail())
                .toList();
        sendMail(String.format("join_request_%s", language.name()),
                title,
                variables,
                emails.toArray(new String[0]));
    }

    @SneakyThrows
    public void sendJoinRequestAcceptedMail(JoinRequest joinRequest) {
        Language language = joinRequest.getLanguage();
        Organization organization = joinRequest.getOrganization();
        String title = String.format(subjects.get(language.name()).get("acceptJoinRequest"),
                organization.getName());
        Map<String, Object> variables = new HashMap<>();
        variables.put("joinRequest", joinRequest);
        variables.put("title", title);
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        variables.put("url", String.format("%s/organization/%s/applications", clientUrl, organization.getId()));
        sendMail(String.format("join_request_accepted_%s", language.name()),
                title,
                variables,
                joinRequest.getUser().getEmail());
    }

    @SneakyThrows
    public void sendJoinRequestDeniedMail(JoinRequest joinRequest) {
        Language language = joinRequest.getLanguage();
        Organization organization = joinRequest.getOrganization();
        String title = String.format(subjects.get(language.name()).get("deniedJoinRequest"),
                organization.getName());
        Map<String, Object> variables = new HashMap<>();
        variables.put("joinRequest", joinRequest);
        variables.put("title", title);
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        sendMail(String.format("join_request_denied_%s", language.name()),
                title,
                variables,
                joinRequest.getUser().getEmail());
    }

    @SneakyThrows
    public void sendFeedbackMail(User user, String message) {
        sendFeedbackMail(user, message, null, null, null, null);
    }

    @SneakyThrows
    public void sendFeedbackMail(User user, String message, String url, byte[] screenshotBytes,
                                 String screenshotName, String screenshotContentType) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("user", user);
        variables.put("title", "SURF Access feedback form");
        String now = LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        variables.put("date", now);
        variables.put("message", message.replaceAll("\n", "<br/>"));
        variables.put("url", url);
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        variables.put("env", environment);
        MailAttachment attachment = null;
        if (screenshotBytes != null && screenshotBytes.length > 0) {
            String filename = screenshotName == null ? "feedback.png" : screenshotName;
            String contentType = screenshotContentType == null ? "image/png" : screenshotContentType;
            attachment = new MailAttachment(filename, screenshotBytes, contentType);
        }
        sendMail("feedback_en",
                "Feedback",
                variables,
                attachment,
                supportEmail);
    }

    private String preferredLanguage() {
        return LocaleContextHolder.getLocale().getLanguage();
    }

    private String sendMail(String templateName, String subject, Map<String, Object> variables, String... to) throws MessagingException, IOException {
        return sendMail(templateName, subject, variables, null, to);
    }

    private String sendMail(String templateName, String subject, Map<String, Object> variables,
                            MailAttachment attachment, String... to) throws MessagingException, IOException {
        String htmlText = this.mailTemplate(templateName + ".html", variables);
        String plainText = this.mailTemplate(templateName + ".txt", variables);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setSubject(subject);
        helper.setText(plainText, htmlText);
        helper.setTo(to);
        helper.setFrom(emailFrom);
        if (attachment != null && attachment.bytes != null) {
            helper.addAttachment(attachment.filename, new ByteArrayResource(attachment.bytes), attachment.contentType);
        }
        new Thread(() -> mailSender.send(message)).start();
        return htmlText;
    }

    private static class MailAttachment {
        private final String filename;
        private final byte[] bytes;
        private final String contentType;

        private MailAttachment(String filename, byte[] bytes, String contentType) {
            this.filename = filename;
            this.bytes = bytes;
            this.contentType = contentType;
        }
    }

    private String mailTemplate(String templateName, Map<String, Object> context) {
        return mustacheFactory.compile(templateName).execute(new StringWriter(), context).toString();
    }

}
