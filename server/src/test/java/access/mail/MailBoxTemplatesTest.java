package access.mail;

import access.manage.Contact;
import access.model.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import tools.jackson.databind.json.JsonMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Renders every mail template in both languages and checks the properties that matter for email clients.
 * The rendered mails are written to target/mail-preview for visual inspection.
 */
class MailBoxTemplatesTest {

    private final BlockingQueue<MimeMessage> sent = new LinkedBlockingQueue<>();

    private MailBox mailBox() throws Exception {
        JavaMailSenderImpl sender = new JavaMailSenderImpl() {
            @Override
            public void send(MimeMessage... mimeMessages) {
                sent.addAll(List.of(mimeMessages));
            }
        };
        sender.setSession(Session.getInstance(new java.util.Properties()));
        return new MailBox(sender, "no-reply@surf.nl", "help@surf.nl", "support@surf.nl", "jira@surf.nl",
                "http://localhost:3002", "test", "SURF Access", JsonMapper.builder().build());
    }

    private MimeMessageParser next(String name) throws Exception {
        MimeMessage message = sent.poll(5, TimeUnit.SECONDS);
        assertNotNull(message, name);
        MimeMessageParser parser = new MimeMessageParser(message).parse();
        String html = parser.getHtmlContent();
        assertFalse(html.contains("{{") || html.contains("}}"), name + " has unresolved tags");
        assertFalse(html.contains("display:flex") || html.contains("display: flex"), name + " uses flex");
        assertFalse(html.contains("<svg"), name + " has inline svg");
        assertEquals(1, html.split("<h1", -1).length - 1, name + " must have exactly one h1");
        assertTrue(html.contains("cid:surfLogo"), name);
        assertTrue(parser.getContentIds().contains("surfLogo"), name + " logo must be attached inline");
        assertFalse(parser.getPlainContent().isBlank(), name);
        assertFalse(parser.getPlainContent().contains("{{"), name);
        Files.createDirectories(Path.of("target/mail-preview"));
        Files.writeString(Path.of("target/mail-preview/" + name + ".html"), html.replace("cid:surfLogo", "../classes/templates/surf_logo.png"));
        return parser;
    }

    @Test
    void allTemplates() throws Exception {
        MailBox mailBox = mailBox();
        User sender = new User(false, "eppn", "sub", "example.com", "Janne", "de Vries", "janne@example.com", "idp");
        User requester = new User(false, "eppn2", "sub2", "eduid.nl", "Sam", "de Boer", "sam@example.com", "idp");
        Organization organization = new Organization("Universiteit Leiden");
        organization.setId(39L);
        organization.getMetaData().put("logoUrl", "https://static.surfconext.nl/media/idp/leiden.png");
        organization.getOrganizationMemberships().add(new OrganizationMembership(requester, organization, Authority.ADMIN));

        for (Language language : Language.values()) {
            LocaleContextHolder.setLocale(Locale.of(language.name()));
            String name = language.name();

            mailBox.sendInviteMail(new Invitation(language, "hash", "ok@ok.com", "Line one\nLine two <b>x</b>",
                    Authority.MEMBER, organization, sender, Set.of()));
            MimeMessageParser invitationMail = next("invitation_message_" + name);
            String html = invitationMail.getHtmlContent();
            assertTrue(html.contains("Line one<br/>Line two &lt;b&gt;x&lt;/b&gt;"), "personal message must be escaped with <br/> line breaks");
            assertTrue(invitationMail.getPlainContent().contains("Line two <b>x</b>"), "plain text must contain the raw message");
            assertTrue(html.contains("Janne de Vries"));
            assertTrue(html.contains("30"));

            mailBox.sendInviteMail(new Invitation(language, "hash", "ok@ok.com", null,
                    Authority.MEMBER, new Organization("No logo"), sender, Set.of()));
            html = next("invitation_nomessage_" + name).getHtmlContent();
            assertFalse(html.contains("<img src=\"http"), "no remote logo without logoUrl");

            JoinRequest joinRequest = new JoinRequest(requester, organization, "msg", language);
            mailBox.sendJoinRequestMail(joinRequest);
            html = next("join_request_" + name).getHtmlContent();
            assertTrue(html.contains("msg"), "join request message must be rendered");
            mailBox.sendJoinRequestAcceptedMail(joinRequest);
            next("join_request_accepted_" + name);
            mailBox.sendJoinRequestDeniedMail(joinRequest);
            next("join_request_denied_" + name);

            mailBox.sendConnectionRequest(sender, List.of(requester), organization, "My App", "Please connect", "/deep");
            next("connection_request_" + name);
            mailBox.sendNewConnectionCreated(sender, List.of("sp@example.com"), "IdP", "SP", "https://sp");
            next("new_connection_made_" + name);
            mailBox.sendUserInactivityWarning(sender, Instant.now());
            next("user_inactivity_warning_" + name);

            mailBox.sendOrgContactReminder(organization, new Contact("technical", "John", "Doe", "jdoe@example.com"), name);
            html = next("org_contact_reminder_" + name).getHtmlContent();
            assertTrue(html.contains("John Doe"), "contact name must be rendered");
            assertTrue(html.contains("Universiteit Leiden"));
            assertTrue(html.contains("http://localhost:3002/organization/39"), "button must link to the organization");
        }
        mailBox.sendFeedbackMail(sender, "Hello\nworld");
        next("feedback_en");
        mailBox.sendJiraError("create", "http://jira", "{}", "boom", "body");
        next("jira_error_en");
    }

    @Test
    void specialCharactersAndInjection() throws Exception {
        MailBox mailBox = mailBox();
        User sender = new User(false, "eppn", "sub", "example.com", "Janne", "de Vries", "janne@example.com", "idp");
        Organization organization = new Organization("Brown & O'Sons");
        organization.setId(1L);
        organization.getMetaData().put("logoUrl", "https://x.nl/a.png\" onerror=\"alert(1)");

        LocaleContextHolder.setLocale(Locale.of("nl"));
        mailBox.sendInviteMail(new Invitation(Language.nl, "hash", "ok@ok.com", null,
                Authority.MEMBER, organization, sender, Set.of()));
        MimeMessageParser mail = next("invitation_special_nl");
        assertTrue(mail.getPlainContent().contains("Brown & O'Sons"), "plain text must not be HTML-escaped");
        assertFalse(mail.getPlainContent().contains("&amp;"));
        assertTrue(mail.getHtmlContent().contains("Brown &amp; O&#39;Sons"), "html must be escaped");
        assertFalse(mail.getHtmlContent().contains("onerror"), "unsafe logo url must be skipped");
        assertTrue(mail.getHtmlContent().contains("supportteam"), "signoff must be localized");

        mailBox.sendUserInactivityWarning(sender, Instant.now());
        message("Je SURF Access-account", mail = next("inactivity_nl"));

        mailBox.sendJiraError("create", "http://jira", "{}", "boom", "body");
        mail = next("jira_error_special");
        assertFalse(mail.getHtmlContent().contains("This mail is from"),
                "no environment banner on the jira mail");
        assertTrue(mail.getPlainContent().contains("http://jira"), "url must be in the plain text");

        mailBox.sendFeedbackMail(sender, "m", "javascript:alert(1)", null, null, null);
        assertFalse(next("feedback_js").getHtmlContent().contains("javascript:"), "non http(s) url must be dropped");
    }

    private void message(String subjectStart, MimeMessageParser parser) throws Exception {
        assertTrue(parser.getSubject().startsWith(subjectStart), parser.getSubject());
    }
}
