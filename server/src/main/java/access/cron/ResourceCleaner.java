package access.cron;


import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
public class ResourceCleaner {

    public static final String LOCK_NAME = "resource_cleaner_user_level_lock";
    private static final Log LOG = LogFactory.getLog(ResourceCleaner.class);


    @Scheduled(fixedDelayString = "${cron.user-cleaner-cron}", initialDelayString = "${cron.user-cleaner-cron-initial-delay}")
    @SchedulerLock(name = LOCK_NAME, lockAtLeastFor = "${cron.user-cleaner-lock-at-least-for}",
            lockAtMostFor = "${cron.user-cleaner-lock-at-most-for}")
    @Transactional
    public void clean() {
        LOG.info("CRON: Cleaning resources");
        this.doClean();
    }

    public Map<String, Object> doClean() {
        return Map.of();
    }
}
