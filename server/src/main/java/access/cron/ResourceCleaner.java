package access.cron;


import access.mail.MailBox;
import access.manage.Contact;
import access.model.EntityType;
import access.model.Environment;
import access.manage.Manage;
import access.model.Application;
import access.model.Organization;
import access.model.User;
import access.repository.OrganizationRepository;
import access.repository.UserRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Component
public class ResourceCleaner {

    public static final String LOCK_NAME = "resource_cleaner_user_level_lock";
    private static final Log LOG = LogFactory.getLog(ResourceCleaner.class);

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final MailBox mailBox;
    private final Manage manage;

    @Value("${cron.org-contact-reminder-days}")
    private int orgContactReminderDays;

    @Value("${cron.org-delete-after-days}")
    private int orgDeleteAfterDays;

    @Value("${cron.user-inactivity-warn-days}")
    private int userInactivityWarnDays;

    @Value("${cron.user-inactivity-delete-days}")
    private int userInactivityDeleteDays;

    public ResourceCleaner(OrganizationRepository organizationRepository,
                           UserRepository userRepository,
                           MailBox mailBox,
                           Manage manage) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.mailBox = mailBox;
        this.manage = manage;
    }

    @Scheduled(fixedDelayString = "${cron.user-cleaner-cron}", initialDelayString = "${cron.user-cleaner-cron-initial-delay}")
    @SchedulerLock(name = LOCK_NAME, lockAtLeastFor = "${cron.user-cleaner-lock-at-least-for}",
            lockAtMostFor = "${cron.user-cleaner-lock-at-most-for}")
    @Transactional
    public void clean() {
        LOG.info("CRON: Cleaning resources");
        Map<String, Object> results = this.doClean();
        LOG.info("CRON: Cleaning results: " + results);
    }

    @Transactional
    public Map<String, Object> doClean() {
        Instant now = Instant.now();

        List<String> orgReminders = sendOrgContactReminders(now);
        List<String> orgsDeleted = deleteOrgsWithNoConnections(now);
        Map<String, List<String>> userResults = cleanInactiveUsers(now);

        return Map.of(
                "orgReminders", orgReminders,
                "orgsDeleted", orgsDeleted,
                "usersWarned", userResults.get("usersWarned"),
                "usersDeleted", userResults.get("usersDeleted")
        );
    }

    private List<String> sendOrgContactReminders(Instant now) {
        Instant reminderCutoff = now.minus(orgContactReminderDays, ChronoUnit.DAYS);
        List<Organization> orgs = organizationRepository
                .findByManageIdentifierIsNotNullAndManageIdentifierIsNot("");

        LinkedHashSet<String> reminded = new LinkedHashSet<>();
        for (Organization org : orgs) {
            if (org.getLastContactReminderAt() != null && org.getLastContactReminderAt().isAfter(reminderCutoff)) {
                continue; // reminder sent recently enough
            }
            try {
                Map<String, Object> provider = manage.providerByManageIdentifier(
                        EntityType.saml20_idp, org.getManageIdentifier(), Environment.PROD);
                if (provider == null || provider.isEmpty()) {
                    continue;
                }
                manage.sanitizeProvider(provider);
                org.mergeMetaData(provider, true);

                @SuppressWarnings("unchecked")
                List<Contact> contacts = (List<Contact>) org.getMetaData().get("contactPersons");
                if (contacts == null) {
                    continue;
                }
                boolean sent = false;
                for (Contact contact : contacts) {
                    if ("administrative".equalsIgnoreCase(contact.getType())) {
                        mailBox.sendOrgContactReminder(org, contact, "en");
                        sent = true;
                    }
                }
                if (sent) {
                    reminded.add(org.getName());
                    org.setLastContactReminderAt(now);
                    organizationRepository.save(org);
                }
            } catch (Exception e) {
                LOG.warn("Failed to send contact reminder for org " + org.getId() + ": " + e.getMessage());
            }
        }
        return new ArrayList<>(reminded);
    }

    private List<String> deleteOrgsWithNoConnections(Instant now) {
        Instant deleteCutoff = now.minus(orgDeleteAfterDays, ChronoUnit.DAYS);
        List<Organization> orgs = organizationRepository
                .findByManageIdentifierIsNullAndCreatedAtBefore(deleteCutoff);

        List<String> deleted = new ArrayList<>();
        for (Organization org : orgs) {
            boolean hasConnections = org.getApplications().stream()
                    .anyMatch(app -> !app.getConnections().isEmpty());
            if (!hasConnections) {
                LOG.info("CRON: Deleting org with no connections: " + org.getId() + " (" + org.getName() + ")");
                organizationRepository.deleteOrganizationById(org.getId());
                deleted.add(org.getName());
            }
        }
        return deleted;
    }

    private Map<String, List<String>> cleanInactiveUsers(Instant now) {
        Instant warnCutoff = now.minus(userInactivityWarnDays, ChronoUnit.DAYS);
        Instant deleteCutoff = now.minus(userInactivityDeleteDays, ChronoUnit.DAYS);

        List<User> inactiveUsers = userRepository.findInactiveUsersWithMemberships(warnCutoff);

        List<String> warned = new ArrayList<>();
        List<String> deleted = new ArrayList<>();
        for (User user : inactiveUsers) {
            Instant activity = user.getLastActivity();
            boolean shouldDelete = activity == null || activity.isBefore(deleteCutoff);
            if (shouldDelete) {
                LOG.info("CRON: Deleting inactive user: " + user.getId() + " (" + user.getEmail() + ")");
                userRepository.deleteById(user.getId());
                deleted.add(user.getEmail());
            } else {
                // between warn cutoff and delete cutoff — send warning (once only)
                if (user.getInactivityWarningSentAt() != null) {
                    continue; // warning already sent; don't spam
                }
                Instant deletionDate = activity.plus(userInactivityDeleteDays, ChronoUnit.DAYS);
                mailBox.sendUserInactivityWarning(user, deletionDate);
                user.setInactivityWarningSentAt(now);
                userRepository.save(user);
                warned.add(user.getEmail());
            }
        }
        return Map.of("usersWarned", warned, "usersDeleted", deleted);
    }
}
