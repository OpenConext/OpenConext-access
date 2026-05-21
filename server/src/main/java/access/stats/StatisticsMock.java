package access.stats;

import access.manage.Manage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

import static access.manage.ManageData.getData;

@SuppressWarnings("unchecked")
@Component
@ConditionalOnProperty(
        prefix = "statistics",
        name = "enabled",
        havingValue = "false"
)
public class StatisticsMock implements Statistics {

    private final Manage manage;

    public StatisticsMock(Manage manage) {
        this.manage = manage;
    }

    @Override
    public List<Object> loginTimeFrame(long from, long to, String scale, String idpEntityId, String spEntityId, boolean includeUnique) {
        long step = step(scale);
        List<Object> result = new ArrayList<>();
        for (long i = from; i <= to; i += step) {
            Map<String, Object> point = new HashMap<>();
            point.put("count_user_id", countValue());
            if (includeUnique) {
                point.put("distinct_count_user_id", countValue());
            }
            if (StringUtils.hasText(spEntityId)) {
                point.put("sp_entity_id", spEntityId);
            }
            if (StringUtils.hasText(idpEntityId)) {
                point.put("idp_entity_id", idpEntityId);
            }
            point.put("time", i * 1000);
            result.add(point);
        }
        return result;
    }

    @Override
    public List<Object> loginAggregated(String period, String idpEntityId, String spEntityId, String groupBy) {
        Calendar today = Calendar.getInstance();
        today.set(Calendar.YEAR, Integer.parseInt(period.substring(0, 4)));
        today.set(Calendar.HOUR_OF_DAY, 0);
        today.set(Calendar.MINUTE, 0);
        today.set(Calendar.DAY_OF_MONTH, 1);
        if (period.length() > 4) {
            switch (period.substring(4, 5).toUpperCase()) {
                case "Q": {
                    today.set(Calendar.MONTH, ((Integer.parseInt(period.substring(5)) - 1) * 3));
                    break;
                }
                case "M": {
                    today.set(Calendar.MONTH, Integer.parseInt(period.substring(5)) - 1);
                    break;
                }
                case "W": {
                    today.set(Calendar.WEEK_OF_YEAR, Integer.parseInt(period.substring(5)));
                    break;
                }
                case "D": {
                    today.set(Calendar.DAY_OF_YEAR, Integer.parseInt(period.substring(5)));
                    break;
                }
            }
        } else {
            today.set(Calendar.MONTH, 0);
        }
        long date = today.getTimeInMillis() / 1000;

        if ("idp_id".equals(groupBy)) {
            // Return mock data grouped by IdP
            List<String> mockIdpNames = List.of(
                    "University of Amsterdam", "Delft University of Technology",
                    "Erasmus University Rotterdam", "Leiden University",
                    "HAN University of Applied Sciences", "Amsterdam University of Applied Sciences",
                    "Utrecht University", "Radboud University");
            return mockIdpNames.stream()
                    .map(name -> {
                        Map<String, Object> point = new HashMap<>();
                        point.put("count_user_id", countValue() * 100);
                        point.put("distinct_count_user_id", countValue() * 10);
                        point.put("idp_entity_id", "https://idp.example.org/" + name.toLowerCase().replace(" ", "-"));
                        point.put("idp_name", name);
                        point.put("time", date);
                        return (Object) point;
                    }).collect(Collectors.toList());
        }

        // When idpEntityId is null (SURFnet user), return mock data for a broad set of SPs
        if (!StringUtils.hasText(idpEntityId)) {
            List<String> mockSpEntityIds = List.of(
                    "https://sp.example.org/shibboleth", "https://wiki.surfnet.nl/shibboleth",
                    "https://teams.surfconext.nl/shibboleth", "https://manage.surfconext.nl/shibboleth",
                    "https://invite.surfconext.nl/shibboleth", "https://pdp.surfconext.nl/shibboleth",
                    "https://dashboard.surfconext.nl/shibboleth", "https://monitoring.surfconext.nl/shibboleth");
            return mockSpEntityIds.stream()
                    .filter(id -> !StringUtils.hasText(spEntityId) || spEntityId.equals(id))
                    .map(id -> {
                        Map<String, Object> point = new HashMap<>();
                        point.put("count_user_id", countValue());
                        point.put("distinct_count_user_id", countValue() / 2);
                        point.put("sp_entity_id", id);
                        point.put("time", date);
                        return point;
                    }).collect(Collectors.toList());
        }

        Map<String, Object> identityProvider = manage.identityProviderByEntityID(idpEntityId);
        Map<String, Object> data = getData(identityProvider);
        List<String> entityIdentifiers = ((List<Map<String, String>>) data.getOrDefault("allowedEntities", List.of()))
                .stream()
                .map(sp -> (String) sp.get("name"))
                .toList();

        List<Map<String, Object>> serviceProvider = manage.serviceProvidersByEntityID(entityIdentifiers);
        return serviceProvider.stream()
                .filter(sp -> !StringUtils.hasText(spEntityId) || spEntityId.equals(getData(sp).get("entityid")))
                .map(sp -> {
                    Map<String, Object> point = new HashMap<>();
                    point.put("count_user_id", countValue());
                    point.put("distinct_count_user_id", countValue() / 2);
                    point.put("sp_entity_id", getData(sp).get("entityid"));
                    point.put("idp_entity_id", idpEntityId);
                    point.put("time", date);
                    return point;
                }).collect(Collectors.toList());
    }

    @Override
    public List<Object> uniqueLoginCount(long from, long to, String idpEntityId, String spEntityId) {
        List<Object> result = new ArrayList<>();
        Map<String, Object> point = new HashMap<>();
        point.put("count_user_id", countValue());
        point.put("sp_entity_id", spEntityId);
        if (StringUtils.hasText(idpEntityId)) {
            point.put("idp_entity_id", idpEntityId);
        }
        point.put("time", from);
        result.add(point);
        return result;
    }

    private long countValue() {
        double base = Math.floor(10000 * (Math.random() + 1));
        return (long) base;
    }

    private long step(String scale) {
        return switch (scale) {
            case "minute" -> 60;
            case "hour" -> 60 * 60;
            case "day" -> 24 * 60 * 60;
            case "week" -> 7 * 24 * 60 * 60;
            case "month" -> 30 * 24 * 60 * 60;
            case "quarter" -> 90 * 24 * 60 * 60;
            case "year" -> 365 * 24 * 60 * 60;
            default -> throw new IllegalArgumentException("Unknown scale:" + scale);
        };
    }
}
