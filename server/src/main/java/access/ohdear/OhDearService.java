package access.ohdear;

import access.remote.RestTemplateFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

import static org.springframework.http.HttpEntity.EMPTY;

@Service
@SuppressWarnings("unchecked")
public class OhDearService {

    private static final Log LOG = LogFactory.getLog(OhDearService.class);

    private static final int PERIOD = 60;
    private static final int PERIOD_ALL = 364;

    private final String baseUrl;
    private RestTemplate restTemplate;
    private final CacheManager cacheManager;

    private static final DateTimeFormatter OHDEAR_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneOffset.UTC);
    private final boolean enabled;
    private StatusResponse disabledResponse;

    @SneakyThrows
    public OhDearService(@Value("${ohdear.apiKey}") String apiToken,
                         @Value("${ohdear.baseUrl}") String baseUrl,
                         @Value("${ohdear.enabled}") boolean enabled,
                         ObjectMapper objectMapper,
                         CacheManager cacheManager) {
        this.baseUrl = baseUrl;
        this.enabled = enabled;
        this.cacheManager = cacheManager;
        if (enabled) {
            restTemplate = RestTemplateFactory.buildRestTemplate(apiToken);
        } else {
            disabledResponse = objectMapper.readValue(
                    new ClassPathResource("ohdear/ohdear.json").getInputStream(),
                    StatusResponse.class);
        }
    }

    private Map<String, Object> get(String url) {
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, EMPTY, Map.class);
        return response.getBody();
    }

    @Scheduled(fixedRate = 30, initialDelay = 1, timeUnit = TimeUnit.MINUTES)
    public void refreshStatus() {
        List.of(PERIOD, PERIOD_ALL)
                .forEach(period -> {
                    long time = System.currentTimeMillis();
                    StatusResponse aggregatedStatusInternal = getAggregatedStatusInternal(period);
                    Objects.requireNonNull(cacheManager.getCache("status")).put(period, aggregatedStatusInternal);
                    LOG.info(String.format("Refreshed all ohDear stats for period %s in %s ms",
                            period, System.currentTimeMillis() - time));
                });
    }

    @Cacheable(value = "status", key = "#period")
    public StatusResponse getAggregatedStatus(int period) {
        return getAggregatedStatusInternal(period);
    }

    private StatusResponse getAggregatedStatusInternal(int period) {
        if (!enabled) {
            return disabledResponse;
        }
        Map<String, Object> monitorsResponse = get(baseUrl + "/monitors");
        List<Map<String, Object>> monitors = (List<Map<String, Object>>) monitorsResponse.get("data");

        Map<String, List<ServiceStatus>> grouped = new HashMap<>();

        monitors.forEach(monitor -> {
            Long id = ((Number) monitor.get("id")).longValue();
            String name = (String) monitor.get("label");
            String url = (String) monitor.get("url");

            String status = deriveStatus(monitor);

            Double uptimePercentage = fetchUptime(id, period);

            List<Incident> incidents = fetchIncidentsFromDowntime(id, period);

            ServiceStatus service = new ServiceStatus(id, name, url, status, uptimePercentage, incidents);

            String groupName = (String) monitor.getOrDefault("group_name", "Other");

            grouped.computeIfAbsent(groupName, k -> new ArrayList<>()).add(service);
        });

        List<Group> groups = new ArrayList<>();
        grouped.forEach((groupName, services) -> groups.add(new Group(groupName, services)));

        return new StatusResponse(deriveOverallStatus(groups), Instant.now().toString(), groups);
    }

    private Double fetchUptime(Long id, int period) {
        try {
            Instant now = Instant.now();
            Instant start = now.minus(period, ChronoUnit.DAYS);

            String startedAt = OHDEAR_FORMAT.format(start);
            String endedAt = OHDEAR_FORMAT.format(now);

            String url = String.format(
                    "%s/monitors/%d/uptime?filter[started_at]=%s&filter[ended_at]=%s&split=day",
                    baseUrl,
                    id,
                    startedAt,
                    endedAt
            );

            Object raw = getRaw(url);

            List<Map<String, Object>> data;

            if (raw instanceof Map) {
                // Case: { data: [...] }
                data = (List<Map<String, Object>>) ((Map<?, ?>) raw).get("data");
            } else if (raw instanceof List) {
                // Case: [...]
                data = (List<Map<String, Object>>) raw;
            } else {
                return null;
            }

            if (data == null || data.isEmpty()) return null;

            double[] total = {0};
            int[] count = {0};

            data.forEach(entry -> {
                Object uptime = entry.get("uptime_percentage");
                if (uptime instanceof Number) {
                    total[0] += ((Number) uptime).doubleValue();
                    count[0]++;
                }
            });

            return count[0] > 0 ? total[0] / count[0] : null;

        } catch (Exception e) {
            LOG.error("Exception in fetchUptime", e);
            return null;
        }
    }

    private List<Incident> fetchIncidentsFromDowntime(Long id, int period) {
        try {
            Instant now = Instant.now();
            Instant start = now.minus(period, ChronoUnit.DAYS);

            String startedAt = OHDEAR_FORMAT.format(start);
            String endedAt = OHDEAR_FORMAT.format(now);

            String url = String.format(
                    "%s/monitors/%d/downtime?filter[started_at]=%s&filter[ended_at]=%s",
                    baseUrl,
                    id,
                    startedAt,
                    endedAt
            );
            Map<String, Object> results = get(url);
            List<Map<String, Object>> data = (List<Map<String, Object>>) results.get("data");
            if (data == null) return List.of();

            List<Incident> incidents = new ArrayList<>();

            data.forEach(downtime -> {
                String message = (String) downtime.getOrDefault("notes_markdown", downtime.getOrDefault("notes_html", "Service disruption detected"));
                incidents.add(new Incident((String) downtime.get("started_at"), (String) downtime.get("ended_at"), message));
            });

            // sort newest first (better for UI)
            incidents.sort((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()));

            return incidents;
        } catch (Exception e) {
            LOG.error("Exception in fetchIncidentsFromDowntime", e);
            return List.of();
        }
    }

    private Object getRaw(String url) {
        ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.GET, EMPTY, Object.class);
        return response.getBody();
    }

    private String deriveStatus(Map<String, Object> monitor) {
        String status = ((String) monitor.getOrDefault("status", "operational")).toLowerCase();

        return switch (status) {
            case "down", "degraded" -> status;
            default -> "operational";
        };
    }

    private String deriveOverallStatus(List<Group> groups) {
        boolean hasDown = groups.stream().flatMap(g -> g.services().stream())
                .anyMatch(s -> "down".equals(s.status()));
        if (hasDown) {
            return "down";
        }

        boolean hasDegraded = groups.stream().flatMap(g -> g.services().stream())
                .anyMatch(s -> "degraded".equals(s.status()));
        if (hasDegraded) {
            return "degraded";
        }

        return "operational";
    }
}
