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

        int orgReminders = sendOrgContactReminders(now);
        int orgsDeleted = deleteOrgsWithNoConnections(now);
        Map<String, Integer> userResults = cleanInactiveUsers(now);

        return Map.of(
                "orgReminders", orgReminders,
                "orgsDeleted", orgsDeleted,
                "usersWarned", userResults.get("usersWarned"),
                "usersDeleted", userResults.get("usersDeleted")
        );
    }

    private int sendOrgContactReminders(Instant now) {
        Instant reminderCutoff = now.minus(orgContactReminderDays, ChronoUnit.DAYS);
        List<Organization> orgs = organizationRepository
                .findByManageIdentifierIsNotNullAndManageIdentifierIsNot("");

        int count = 0;
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
                for (Contact contact : contacts) {
                    if ("administrative".equalsIgnoreCase(contact.getType())) {
                        mailBox.sendOrgContactReminder(org, contact, "en");
                        count++;
                    }
                }
                org.setLastContactReminderAt(now);
                organizationRepository.save(org);
            } catch (Exception e) {
                LOG.warn("Failed to send contact reminder for org " + org.getId() + ": " + e.getMessage());
            }
        }
        return count;
    }

    private int deleteOrgsWithNoConnections(Instant now) {
        Instant deleteCutoff = now.minus(orgDeleteAfterDays, ChronoUnit.DAYS);
        List<Organization> orgs = organizationRepository
                .findByManageIdentifierIsNullAndCreatedAtBefore(deleteCutoff);

        int count = 0;
        for (Organization org : orgs) {
            boolean hasConnections = org.getApplications().stream()
                    .anyMatch(app -> !app.getConnections().isEmpty());
            if (!hasConnections) {
                LOG.info("CRON: Deleting org with no connections: " + org.getId() + " (" + org.getName() + ")");
                organizationRepository.deleteOrganizationById(org.getId());
                count++;
            }
        }
        return count;
    }

    private Map<String, Integer> cleanInactiveUsers(Instant now) {
        Instant warnCutoff = now.minus(userInactivityWarnDays, ChronoUnit.DAYS);
        Instant deleteCutoff = now.minus(userInactivityDeleteDays, ChronoUnit.DAYS);

        List<User> inactiveUsers = userRepository.findInactiveUsersWithMemberships(warnCutoff);

        int warned = 0;
        int deleted = 0;
        for (User user : inactiveUsers) {
            Instant activity = user.getLastActivity();
            boolean shouldDelete = activity == null || activity.isBefore(deleteCutoff);
            if (shouldDelete) {
                LOG.info("CRON: Deleting inactive user: " + user.getId() + " (" + user.getEmail() + ")");
                userRepository.deleteById(user.getId());
                deleted++;
            } else {
                // between warn cutoff and delete cutoff — send warning
                Instant deletionDate = activity.plus(userInactivityDeleteDays, ChronoUnit.DAYS);
                mailBox.sendUserInactivityWarning(user, deletionDate);
                warned++;
            }
        }
        return Map.of("usersWarned", warned, "usersDeleted", deleted);
    }
}
