package access.ohdear;

import access.CustomWireMockExtension;
import tools.jackson.databind.ObjectMapper;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.Charset;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class OhDearServiceTest {

    @RegisterExtension
    protected static CustomWireMockExtension mockServer = new CustomWireMockExtension(8089);

    protected OhDearService ohDearService = new OhDearService(
            "test-token",
            "http://localhost:8089/api",
            true,
            new ObjectMapper(),
            new NoOpCacheManager()
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

        StatusResponse response = ohDearService.getAggregatedStatus(60);

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

        StatusResponse response = ohDearService.getAggregatedStatus(60);

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

        StatusResponse response = ohDearService.getAggregatedStatus(60);

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
    void shouldFallBackToNotesHtml_whenNotesMarkdownKeyIsPresentButNull() throws Exception {

        // --- monitors ---
        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors_operational.json"))));

        // --- uptime ---
        stubFor(get(urlPathMatching("/api/monitors/.*/uptime.*"))
                .willReturn(okJson(json("uptime_array.json"))));

        // --- downtime: notes_markdown key present but null, notes_html has content ---
        stubFor(get(urlPathMatching("/api/monitors/.*/downtime.*"))
                .willReturn(okJson(json("downtime_null_markdown.json"))));

        StatusResponse response = ohDearService.getAggregatedStatus(60);

        ServiceStatus service = response.groups().stream()
                .flatMap(g -> g.services().stream())
                .findFirst()
                .orElseThrow();

        assertThat(service.incidents()).hasSize(2);

        // notes_markdown null, notes_html present -> falls back to notes_html
        Incident withHtmlNote = service.incidents().stream()
                .filter(i -> "Some html note".equals(i.getMessage()))
                .findFirst()
                .orElseThrow();
        assertThat(withHtmlNote.getMessage()).isEqualTo("Some html note");

        // both notes_markdown and notes_html null -> falls back to default message
        Incident withoutNote = service.incidents().stream()
                .filter(i -> !"Some html note".equals(i.getMessage()))
                .findFirst()
                .orElseThrow();
        assertThat(withoutNote.getMessage()).isEqualTo("Service disruption detected");
    }

    @Test
    void shouldUseStatusPageUpdateText_whenDowntimeHasNoNotes() throws Exception {

        // --- monitors ---
        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors_operational.json"))));

        // --- uptime ---
        stubFor(get(urlPathMatching("/api/monitors/.*/uptime.*"))
                .willReturn(okJson(json("uptime_array.json"))));

        // --- downtime: no notes_markdown/notes_html at all ---
        stubFor(get(urlPathMatching("/api/monitors/.*/downtime.*"))
                .willReturn(okJson(json("downtime_no_notes.json"))));

        // --- status page updates: the human-authored note lives here instead ---
        stubFor(get(urlEqualTo("/api/status-pages"))
                .willReturn(okJson(json("status_pages.json"))));

        StatusResponse response = ohDearService.getAggregatedStatus(60);

        Incident incident = response.groups().stream()
                .flatMap(g -> g.services().stream())
                .flatMap(s -> s.incidents().stream())
                .findFirst()
                .orElseThrow();

        assertThat(incident.getMessage()).isEqualTo("Root cause: a human mistake caused a brief outage.");
    }

    @Test
    void shouldFallbackToOtherGroup_whenNoTags() throws Exception {

        stubFor(get(urlEqualTo("/api/monitors"))
                .willReturn(okJson(json("monitors_no_tags.json"))));

        stubFor(get(urlPathMatching("/api/monitors/.*/uptime.*"))
                .willReturn(okJson(json("uptime_array.json"))));

        StatusResponse response = ohDearService.getAggregatedStatus(60);

        assertThat(response.groups())
                .anyMatch(g -> g.name().equals("Other"));
    }

    private String json(String name) throws Exception {
        return IOUtils.toString(new ClassPathResource("ohdear/" + name).getInputStream(), Charset.defaultCharset());
    }
}