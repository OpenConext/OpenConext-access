package access.ohdear;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@SuppressWarnings("unchecked")
public class OhDearService {

    private final String apiToken;

    private final String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public OhDearService(@Value("${ohdear.apiKey}") String apiToken, @Value("${ohdear.baseUrl}") String baseUrl) {
        this.apiToken = apiToken;
        this.baseUrl = baseUrl;
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> get(String url) {
        HttpEntity<Void> entity = new HttpEntity<>(headers());
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        return response.getBody();
    }

    @Scheduled(fixedRate = 15, timeUnit = TimeUnit.MINUTES)
    @CachePut("status")
    public StatusResponse refreshStatus() {
        return getAggregatedStatusInternal(); // same logic without @Cacheable
    }

    @Cacheable("status")
    public StatusResponse getAggregatedStatus() {
        return getAggregatedStatusInternal();
    }

    private StatusResponse getAggregatedStatusInternal() {
        String monitorsUrl = baseUrl + "/monitors";
        Map<String, Object> monitorsResponse = get(monitorsUrl);

        List<Map<String, Object>> monitors = (List<Map<String, Object>>) monitorsResponse.get("data");

        List<ServiceStatus> services = new ArrayList<>();

        for (Map<String, Object> monitor : monitors) {

            Long id = ((Number) monitor.get("id")).longValue();
            String name = (String) monitor.get("name");
            String url = (String) monitor.get("url");

            // Fetch recent check results
            String checksUrl = baseUrl + "/monitors/" + id + "/check-results?per_page=5";
            Map<String, Object> checksResponse = get(checksUrl);
            List<Map<String, Object>> checks = (List<Map<String, Object>>) checksResponse.get("data");

            String status = deriveStatus(checks);
            List<Incident> incidents = deriveIncidents(checks);
            Double uptimePercentage;
            try {
                String uptimeUrl = baseUrl + "/monitors/" + id + "/uptime";
                Map<String, Object> uptimeResponse = get(uptimeUrl);
                uptimePercentage = Double.valueOf(uptimeResponse.get("uptime_percentage").toString());
            } catch (Exception e) {
                uptimePercentage = null;
            }
            ServiceStatus service = new ServiceStatus(id, name, url, status, uptimePercentage, incidents);
            services.add(service);
        }

        String overallStatus = deriveOverallStatus(services);

        return new StatusResponse(overallStatus, services);
    }

    private String deriveStatus(List<Map<String, Object>> checks) {
        int failures = 0;
        for (Map<String, Object> check : checks) {
            Boolean success = (Boolean) check.get("is_successful");
            if (success == null || !success) {
                failures++;
            }
        }

        if (failures >= 3) return "down";
        if (failures > 0) return "degraded";
        return "operational";
    }

    private List<Incident> deriveIncidents(List<Map<String, Object>> checks) {
        List<Incident> incidents = new ArrayList<>();

        // Ensure oldest → newest
        checks.sort(Comparator.comparing(c -> (String) c.get("started_at")));

        Incident currentIncident = null;

        for (Map<String, Object> check : checks) {
            Boolean success = (Boolean) check.get("is_successful");
            String timestamp = (String) check.get("started_at");

            if (success == null || !success) {
                // Failure
                if (currentIncident == null) {
                    String message = (String) check.get("error_message");
                    currentIncident = new Incident(timestamp, null, message);
                }
            } else {
                // Success
                if (currentIncident != null) {
                    currentIncident.setResolvedAt(timestamp);
                    incidents.add(currentIncident);
                    currentIncident = null;
                }
            }
        }

        // If still failing → ongoing incident
        if (currentIncident != null) {
            currentIncident.setResolvedAt(null);
            incidents.add(currentIncident);
        }

        return incidents;
    }

    private String deriveOverallStatus(List<ServiceStatus> services) {
        boolean hasDown = services.stream().anyMatch(s -> "down".equals(s.status()));
        if (hasDown) return "down";

        boolean hasDegraded = services.stream().anyMatch(s -> "degraded".equals(s.status()));
        if (hasDegraded) return "degraded";

        return "operational";
    }
}
