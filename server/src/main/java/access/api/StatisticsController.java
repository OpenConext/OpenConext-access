package access.api;

import access.config.Config;
import access.model.User;
import access.stats.Scale;
import access.stats.Statistics;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stats")
public class StatisticsController {

    private final Statistics statistics;
    private final Config config;

    @Autowired
    public StatisticsController(Statistics statistics, Config config) {
        this.statistics = statistics;
        this.config = config;
    }

    /**
     * SURFnet users (schacHomeOrganization == surfSchacHomeOrganization) see data for all IdPs (null idpEntityId).
     * Non-SURFnet users are restricted to their own IdP — always enforced server-side.
     */
    private String resolveIdpEntityId(User user) {
        if (user == null || user.isSuperUser()) {
            return null;
        }
        List<String> ownerSchacHomeOrgs = config.getOwnerSchacHomeOrgs();
        if (ownerSchacHomeOrgs.contains(user.getSchacHomeOrganization())) {
            return null;
        }
        return user.getAuthenticatingAuthority();
    }

    //Used for retrieval of all logins for one SP
    @GetMapping("/loginTimeFrame")
    public List<Object> loginTimeFrame(User user,
                                       @RequestParam("from") long from,
                                       @RequestParam("to") long to,
                                       @RequestParam("scale") Scale scale,
                                       @RequestParam(value = "spEntityId", required = false) String spEntityId,
                                       @RequestParam(value = "includeUnique", required = false, defaultValue = "true") boolean includeUnique) {
        return statistics.loginTimeFrame(from, to, scale.name(), resolveIdpEntityId(user), spEntityId, includeUnique);
    }

    //Used for retrieval of all logins for all SPs
    @GetMapping("/loginAggregated")
    public List<Object> loginAggregated(User user,
                                        @RequestParam("period") String period,
                                        @RequestParam(value = "spEntityId", required = false) String spEntityId,
                                        @RequestParam(value = "groupBy", required = false, defaultValue = "sp_id") String groupBy) {
        return statistics.loginAggregated(period, resolveIdpEntityId(user), spEntityId, groupBy);
    }

    //Used for retrieval of all logins for one SP without a period
    @GetMapping("uniqueLoginCount")
    public List<Object> uniqueLoginCount(User user,
                                         @RequestParam("from") long from,
                                         @RequestParam("to") long to,
                                         @RequestParam(value = "spEntityId") String spEntityId) {
        return statistics.uniqueLoginCount(from, to, resolveIdpEntityId(user), spEntityId);
    }

}
