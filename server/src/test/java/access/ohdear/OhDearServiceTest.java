package access.ohdear;

import access.CustomWireMockExtension;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;

import java.nio.charset.Charset;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class OhDearServiceTest {

    @RegisterExtension
    protected static CustomWireMockExtension mockServer = new CustomWireMockExtension(8081);

    protected OhDearService ohDearService = new OhDearService(
            "test-token",
            "http://localhost:8081/api",
            true
    );

    @Test
    void shouldAggregateStatus_withGroupedServices_andUptime_fromMapResponse() throws Exception {

        // --- monitors ---
        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors.json"))));

        // --- uptime (map response) ---
        stubFor(get(urlPathMatching("/api/monitors/1/uptime.*"))
                .willReturn(okJson(json("uptime_map.json"))));

        // --- uptime (array response) ---
        stubFor(get(urlPathMatching("/api/monitors/2/uptime.*"))
                .willReturn(okJson(json("uptime_array.json"))));

        StatusResponse response = ohDearService.getAggregatedStatus();

        assertThat(response).isNotNull();
        assertThat(response.groups()).hasSize(2);

        // Verify grouping
        assertThat(response.groups())
                .anyMatch(g -> g.name().equals("API"))
                .anyMatch(g -> g.name().equals("Frontend"));

        // Verify services exist
        assertThat(response.groups().stream()
                .flatMap(g -> g.services().stream()))
                .hasSize(2);

        // Verify uptime calculated
        ServiceStatus s1 = response.groups().stream()
                .flatMap(g -> g.services().stream())
                .filter(s -> s.id().equals(1L))
                .findFirst()
                .orElseThrow();

        assertThat(s1.uptimePercentage()).isNotNull();

        // Verify overall status
        assertThat(response.overallStatus()).isIn("operational", "degraded", "down");
    }

    @Test
    void shouldHandleUptimeFailureGracefully() throws Exception {

        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors.json"))));

        // uptime returns 500
        stubFor(get(urlPathMatching("/api/monitors/.*/uptime.*"))
                .willReturn(serverError()));

        StatusResponse response = ohDearService.getAggregatedStatus();

        ServiceStatus serviceStatus = response.groups().stream()
                .flatMap(g -> g.services().stream())
                .findFirst()
                .orElseThrow();

        assertThat(serviceStatus.uptimePercentage()).isNull();
    }

    @Test
    void shouldConstructIncidentsFromDowntimeResponse() throws Exception {

        // --- monitors ---
        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors_operational.json"))));

        // --- uptime ---
        stubFor(get(urlPathMatching("/api/monitors/.*/uptime.*"))
                .willReturn(okJson(json("uptime_array.json"))));

        // --- downtime ---
        stubFor(get(urlPathMatching("/api/monitors/.*/downtime.*"))
                .willReturn(okJson(json("downtime.json"))));

        StatusResponse response = ohDearService.getAggregatedStatus();

        ServiceStatus service = response.groups().stream()
                .flatMap(g -> g.services().stream())
                .findFirst()
                .orElseThrow();

        assertThat(service.incidents()).hasSize(2);

        // newest first
        Incident first = service.incidents().get(0);
        Incident second = service.incidents().get(1);

        // verify resolved incident
        assertThat(second.getResolvedAt()).isNotNull();

        // verify ongoing incident (ended_at = null)
        assertThat(first.getResolvedAt()).isNull();

        // verify message mapping
        assertThat(first).extracting("message").isNotNull();
    }

    @Test
    void shouldFallbackToOtherGroup_whenNoTags() throws Exception {

        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors_no_tags.json"))));

        stubFor(get(urlPathMatching("/api/monitors/.*/uptime.*"))
                .willReturn(okJson(json("uptime_array.json"))));

        StatusResponse response = ohDearService.getAggregatedStatus();

        assertThat(response.groups())
                .anyMatch(g -> g.name().equals("Other"));
    }

    private String json(String name) throws Exception {
        return IOUtils.toString(new ClassPathResource("ohdear/" + name).getInputStream(), Charset.defaultCharset());
    }
}