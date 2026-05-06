package access.ohdear;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
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
import java.util.concurrent.TimeUnit;

@Service
@SuppressWarnings("unchecked")
public class OhDearService {

    private final String apiToken;
    private final String baseUrl;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final DateTimeFormatter OHDEAR_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneOffset.UTC);
    private final boolean enabled;

    public OhDearService(@Value("${ohdear.apiKey}") String apiToken,
                         @Value("${ohdear.baseUrl}") String baseUrl,
                         @Value("${ohdear.enabled}") boolean enabled) {
        this.apiToken = apiToken;
        this.baseUrl = baseUrl;
        this.enabled = enabled;
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    private Map<String, Object> get(String url) {
        HttpEntity<Void> entity = new HttpEntity<>(headers());
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        return response.getBody();
    }

    @Scheduled(fixedRate = 30, initialDelay = 1, timeUnit = TimeUnit.MINUTES)
    @CachePut("status")
    public StatusResponse refreshStatus() {
        return getAggregatedStatusInternal();
    }

    @Cacheable("status")
    public StatusResponse getAggregatedStatus() {
        return getAggregatedStatusInternal();
    }

    private StatusResponse getAggregatedStatusInternal() {
        if (!enabled) {
            return new StatusResponse("operational", Instant.now().toString(), List.of());
        }
        Map<String, Object> monitorsResponse = get(baseUrl + "/monitors");
        List<Map<String, Object>> monitors = (List<Map<String, Object>>) monitorsResponse.get("data");

        Map<String, List<ServiceStatus>> grouped = new HashMap<>();

        for (Map<String, Object> monitor : monitors) {
            Long id = ((Number) monitor.get("id")).longValue();
            String name = (String) monitor.get("label");
            String url = (String) monitor.get("url");

            String status = deriveStatus(monitor);

            Double uptimePercentage = fetchUptime(id);

            List<Incident> incidents = fetchIncidentsFromDowntime(id);

            ServiceStatus service = new ServiceStatus(id, name, url, status, uptimePercentage, incidents);

            String groupName = (String) monitor.getOrDefault("group_name", "Other");

            grouped.computeIfAbsent(groupName, k -> new ArrayList<>()).add(service);
        }

        List<Group> groups = new ArrayList<>();
        for (Map.Entry<String, List<ServiceStatus>> e : grouped.entrySet()) {
            groups.add(new Group(e.getKey(), e.getValue()));
        }

        return new StatusResponse(deriveOverallStatus(groups), Instant.now().toString(), groups);
    }

    private Double fetchUptime(Long id) {
        try {
            Instant now = Instant.now();
            Instant start = now.minus(90, ChronoUnit.DAYS);

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

            double total = 0;
            int count = 0;

            for (Map<String, Object> entry : data) {
                Object uptime = entry.get("uptime_percentage");
                if (uptime instanceof Number) {
                    total += ((Number) uptime).doubleValue();
                    count++;
                }
            }

            return count > 0 ? total / count : null;

        } catch (Exception e) {
            return null;
        }
    }

    private List<Incident> fetchIncidentsFromDowntime(Long id) {
        try {
            Instant now = Instant.now();
            Instant start = now.minus(90, ChronoUnit.DAYS);

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

            for (Map<String, Object> downtime : data) {
                String message = (String) downtime.getOrDefault("notes_markdown", downtime.getOrDefault("notes_html", "Service disruption detected"));
                incidents.add(new Incident((String) downtime.get("started_at"), (String) downtime.get("ended_at"), message));
            }

            // sort newest first (better for UI)
            incidents.sort((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()));

            return incidents;
        } catch (Exception e) {
            return List.of();
        }
    }

    private Object getRaw(String url) {
        HttpEntity<Void> entity = new HttpEntity<>(headers());
        ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.GET, entity, Object.class);
        return response.getBody();
    }

    private String deriveStatus(Map<String, Object> monitor) {
        String status = (String) monitor.get("status");
        if ("down".equalsIgnoreCase(status)) return "down";
        if ("degraded".equalsIgnoreCase(status)) return "degraded";
        return "operational";
    }

    private String deriveOverallStatus(List<Group> groups) {
        boolean hasDown = groups.stream().flatMap(g -> g.services().stream())
                .anyMatch(s -> "down".equals(s.status()));
        if (hasDown) return "down";

        boolean hasDegraded = groups.stream().flatMap(g -> g.services().stream())
                .anyMatch(s -> "degraded".equals(s.status()));
        if (hasDegraded) return "degraded";

        return "operational";
    }
}
