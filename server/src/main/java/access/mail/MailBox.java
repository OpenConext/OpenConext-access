package access.mail;

import access.model.*;
import access.manage.Contact;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
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
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringWriter;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
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
    private final String jiraErrorEmail;
    private final String environment;
    private final String productName;

    private static final String PRIVACY_URL_NL = "https://support.surfconext.nl/privacy-nl";
    private static final String PRIVACY_URL_EN = "https://support.surfconext.nl/privacy";
    private static final String LOGO_CONTENT_ID = "surfLogo";

    private final Map<String, Map<String, String>> subjects;

    private final MustacheFactory htmlMustacheFactory = new DefaultMustacheFactory(MailBox::templateReader);

    //Plain-text mails must not be HTML-escaped: "Brown & Sons" would otherwise arrive as "Brown &amp; Sons"
    private final MustacheFactory textMustacheFactory = new DefaultMustacheFactory(MailBox::templateReader) {
        @Override
        public void encode(String value, Writer writer) {
            try {
                writer.write(value);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
    };

    private static Reader templateReader(String resourceName) {
        InputStream override = MailBox.class.getClassLoader()
                .getResourceAsStream("myCustomizations/templates/" + resourceName);
        if (override != null) {
            return new InputStreamReader(override, StandardCharsets.UTF_8);
        }
        InputStream fallback = MailBox.class.getClassLoader()
                .getResourceAsStream("templates/" + resourceName);
        return fallback != null ? new InputStreamReader(fallback, StandardCharsets.UTF_8) : null;
    }

    public MailBox(
            JavaMailSender mailSender,
            String emailFrom,
            String serviceDeskEmail,
            String supportEmail,
            String jiraErrorEmail,
            String clientUrl,
            String environment,
            String productName,
            ObjectMapper objectMapper) throws IOException {
        this.mailSender = mailSender;
        this.emailFrom = emailFrom;
        this.serviceDeskEmail = serviceDeskEmail;
        this.supportEmail = supportEmail;
        this.jiraErrorEmail = jiraErrorEmail;
        this.clientUrl = clientUrl;
        this.environment = environment;
        this.productName = productName;
        ClassPathResource subjectsOverride = new ClassPathResource("myCustomizations/templates/subjects.json");
        ClassPathResource subjectsDefault = new ClassPathResource("templates/subjects.json");
        ClassPathResource subjectsResource = subjectsOverride.exists() ? subjectsOverride : subjectsDefault;
        this.subjects = objectMapper.readValue(subjectsResource.getInputStream(), new TypeReference<>() {
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
        variables.put("organizationName", invitation.getOrganization().getName());
        Instant created = invitation.getCreatedAt();
        Instant expiry = invitation.getExpiryDate();
        variables.put("validityDays", created != null && expiry != null ? Duration.between(created, expiry).toDays() : 30);
        User sender = invitation.getInvitee();
        variables.put("senderName", sender.getName());
        variables.put("senderOrganization", sender.getSchacHomeOrganization());
        Object logoUrl = invitation.getOrganization().getMetaData().get("logoUrl");
        //Only absolute http(s) logos can be rendered by mail clients, base64 or relative ones are skipped
        if (logoUrl instanceof String logo && logo.matches("(?i)^https?://[^\\s\"'<>]+$")) {
            variables.put("senderLogoUrl", logo);
        }
        if (StringUtils.hasText(invitation.getMessage())) {
            //Templates use {{message}} (Mustache-escaped) with CSS white-space:pre-line for line breaks -
            //never inject raw HTML here, this is free text supplied by another user
            variables.put("message", invitation.getMessage());
            variables.put("messageHtml", htmlMessage(invitation.getMessage()));
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
            //Templates use {{message}} (Mustache-escaped) with CSS white-space:pre-line for line breaks -
            //never inject raw HTML here, this is free text supplied by another user
            variables.put("message", message);
            variables.put("messageHtml", htmlMessage(message));
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
        if (StringUtils.hasText(joinRequest.getMessage())) {
            //Free text from another user, rendered escaped by the template
            variables.put("message", joinRequest.getMessage());
            variables.put("messageHtml", htmlMessage(joinRequest.getMessage()));
        }
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
        variables.put("title", this.productName + " feedback form");
        String now = LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        variables.put("date", now);
        variables.put("message", message);
        variables.put("messageHtml", htmlMessage(message));
        //The url is client supplied and ends up in an href: only absolute http(s) links
        if (url != null && url.matches("(?i)^https?://[^\\s\"'<>]+$")) {
            variables.put("url", url);
        }
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

    @SneakyThrows
    public void sendOrgContactReminder(Organization organization, Contact contact, String language) {
        String lang = language != null ? language : preferredLanguage();
        String title = String.format(subjects.get(lang).get("orgContactReminder"), organization.getName());
        Map<String, Object> variables = new HashMap<>();
        variables.put("organization", organization);
        variables.put("contact", contact);
        variables.put("title", title);
        variables.put("url", String.format("%s/organization/%s", clientUrl, organization.getId()));
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        sendMail(String.format("org_contact_reminder_%s", lang), title, variables, contact.getEmail());
    }

    @SneakyThrows
    public void sendUserInactivityWarning(User user, Instant deletionDate) {
        String lang = preferredLanguage();
        String title = String.format(subjects.get(lang).get("userInactivityWarning"), productName);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy").withZone(ZoneId.systemDefault());
        Map<String, Object> variables = new HashMap<>();
        variables.put("user", user);
        variables.put("title", title);
        variables.put("lastActivity", user.getLastActivity() != null ? formatter.format(user.getLastActivity()) : "unknown");
        variables.put("deletionDate", formatter.format(deletionDate));
        variables.put("clientUrl", clientUrl);
        if (!environment.equalsIgnoreCase("prod")) {
            variables.put("environment", environment);
        }
        sendMail(String.format("user_inactivity_warning_%s", lang), title, variables, user.getEmail());
    }

    @SneakyThrows
    public void sendJiraError(String operation, String url, String requestPayload, String errorMessage, String responseBody) {
        String title = String.format(subjects.get("en").get("jiraError"), environment, operation);
        Map<String, Object> variables = new HashMap<>();
        variables.put("title", title);
        variables.put("url", url);
        variables.put("operation", operation);
        variables.put("requestPayload", requestPayload);
        variables.put("errorMessage", errorMessage);
        variables.put("responseBody", responseBody);
        //Not "environment": that variable drives the "this mail is from the X environment" banner, which is for non-prod only
        variables.put("env", environment);
        sendMail("jira_error_en", title, variables, jiraErrorEmail);
    }

    private String preferredLanguage() {
        String language = LocaleContextHolder.getLocale().getLanguage();
        //Mail templates only exist for the languages in the Language enum
        return Arrays.stream(Language.values()).anyMatch(l -> l.name().equals(language)) ? language : Language.en.name();
    }

    private String sendMail(String templateName, String subject, Map<String, Object> variables, String... to) throws MessagingException, IOException {
        return sendMail(templateName, subject, variables, null, to);
    }

    private String sendMail(String templateName, String subject, Map<String, Object> variables,
                            MailAttachment attachment, String... to) throws MessagingException, IOException {
        variables.putIfAbsent("productName", this.productName);
        boolean dutch = templateName.endsWith("_" + Language.nl.name());
        variables.putIfAbsent("lang", dutch ? Language.nl.name() : Language.en.name());
        variables.putIfAbsent("nl", dutch);
        variables.putIfAbsent("supportEmail", this.supportEmail);
        variables.putIfAbsent("privacyUrl", dutch ? PRIVACY_URL_NL : PRIVACY_URL_EN);
        String htmlText = this.mailTemplate(templateName + ".html", variables);
        String plainText = this.mailTemplate(templateName + ".txt", variables);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setSubject(subject);
        helper.setText(plainText, htmlText);
        //Inline (cid:) image: Gmail and Outlook strip inline SVG and data: URIs. Must be added after setText
        helper.addInline(LOGO_CONTENT_ID, logoResource(), "image/png");
        helper.setTo(to);
        helper.setFrom(emailFrom);
        if (attachment != null && attachment.bytes != null) {
            helper.addAttachment(attachment.filename, new ByteArrayResource(attachment.bytes), attachment.contentType);
        }
        new Thread(() -> mailSender.send(message)).start();
        return htmlText;
    }

    /**
     * Free text from another user: HTML-escaped, with line breaks as {@code <br/>} because
     * CSS white-space is ignored by e.g. Outlook. Use only with {{{messageHtml}}}.
     */
    private static String htmlMessage(String message) {
        return HtmlUtils.htmlEscape(message).replaceAll("\r?\n", "<br/>");
    }

    private ClassPathResource logoResource() {
        ClassPathResource override = new ClassPathResource("myCustomizations/templates/surf_logo.png");
        return override.exists() ? override : new ClassPathResource("templates/surf_logo.png");
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
        MustacheFactory factory = templateName.endsWith(".txt") ? textMustacheFactory : htmlMustacheFactory;
        return factory.compile(templateName).execute(new StringWriter(), context).toString();
    }

}
