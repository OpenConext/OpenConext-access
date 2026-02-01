package access.api;

import access.model.User;
import access.stats.Statistics;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stats")
public class StatisticsController {

    private Statistics statistics;

    @Autowired
    public StatisticsController(Statistics statistics) {
        this.statistics = statistics;
    }

    //Used for retrieval of all logins for one SP
    @GetMapping("/loginTimeFrame")
    public List<Object> loginTimeFrame(User user,
                                       @RequestParam("from") long from,
                                       @RequestParam("to") long to,
                                       @RequestParam("scale") String scale,
                                       @RequestParam(value = "spEntityId", required = false) String spEntityId) {
        String authenticatingAuthority = user.getAuthenticatingAuthority();
        return statistics.loginTimeFrame(from, to, scale, authenticatingAuthority, spEntityId);
    }

    //Used for retrieval of all logins for all SPs
    @GetMapping("/loginAggregated")
    public List<Object> loginAggregated(User user,
                                        @RequestParam("period") String period,
                                        @RequestParam(value = "spEntityId", required = false) String spEntityId) {
        String authenticatingAuthority = user.getAuthenticatingAuthority();
        return statistics.loginAggregated(period, authenticatingAuthority, spEntityId);
    }

    //Used for retrieval of all logins for one SP without a period
    @GetMapping("uniqueLoginCount")
    public List<Object> uniqueLoginCount(User user,
                                         @RequestParam("from") long from,
                                         @RequestParam("to") long to,
                                         @RequestParam(value = "spEntityId") String spEntityId) {
        String authenticatingAuthority = user.getAuthenticatingAuthority();
        return statistics.uniqueLoginCount(from, to, authenticatingAuthority, spEntityId);
    }

}
