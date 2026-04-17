package access.stats;

import access.CustomWireMockExtension;
import com.github.tomakehurst.wiremock.stubbing.ServeEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class StatisticsRemoteTest {

    private static final String IDP = "http://login.surf.nl/adfs/services/trust?q=1&k=2";

    @RegisterExtension
    static CustomWireMockExtension wireMock = new CustomWireMockExtension(8891);

    private final StatisticsRemote stats = new StatisticsRemote("user", "password", "http://localhost:8891");

    @Test
    void shouldEncodeIdpIdExactlyOnce() {
        stubFor(get(urlPathEqualTo("/public/login_time_frame"))
                .withQueryParam("idp_id", equalTo(IDP))
                .withQueryParam("from", equalTo("1000"))
                .withQueryParam("to", equalTo("2000"))
                .willReturn(okJson("[]")));

        List<Object> result = stats.loginTimeFrame(1000, 2000, "day", IDP, null);

        assertNotNull(result);

        verify(getRequestedFor(urlPathEqualTo("/public/login_time_frame"))
                .withQueryParam("idp_id", equalTo(IDP)));

        List<ServeEvent> events = wireMock.getAllServeEvents();
        String rawUrl = events.get(0).getRequest().getUrl();
        // = and & inside the idp_id value must be encoded, but ? / : must NOT be double-encoded
        assertEquals("/public/login_time_frame?include_unique=true&idp_id=http://login.surf.nl/adfs/services/trust?q%3D1%26k%3D2&from=1000&to=2000&scale=day&epoch=ms", rawUrl);
    }

    @Test
    void loginTimeFrameWithSpFilter() {
        stubFor(get(urlPathEqualTo("/public/login_time_frame"))
                .willReturn(okJson("[]")));

        List<Object> result = stats.loginTimeFrame(1000, 2000, "day", IDP, "https://sp.example.org/shibboleth");

        assertNotNull(result);

        verify(getRequestedFor(urlPathEqualTo("/public/login_time_frame"))
                .withQueryParam("sp_id", equalTo("https://sp.example.org/shibboleth")));
    }

    @Test
    void loginTimeFrameWithoutIdp() {
        stubFor(get(urlPathEqualTo("/public/login_time_frame"))
                .willReturn(okJson("[]")));

        List<Object> result = stats.loginTimeFrame(1000, 2000, "day", null, null);

        assertNotNull(result);

        // idp_id should not appear in the URL
        List<ServeEvent> events = wireMock.getAllServeEvents();
        String rawUrl = events.get(0).getRequest().getUrl();
        assertNotNull(rawUrl);
        assertEquals(-1, rawUrl.indexOf("idp_id"));
    }

    @Test
    void loginAggregated() {
        stubFor(get(urlPathEqualTo("/public/login_aggregated"))
                .willReturn(okJson("[]")));

        List<Object> result = stats.loginAggregated("2026", IDP, null, "sp_entity_id");

        assertNotNull(result);

        verify(getRequestedFor(urlPathEqualTo("/public/login_aggregated"))
                .withQueryParam("idp_id", equalTo(IDP))
                .withQueryParam("period", equalTo("2026"))
                .withQueryParam("group_by", equalTo("sp_entity_id")));
    }

    @Test
    void uniqueLoginCount() {
        stubFor(get(urlPathEqualTo("/public/unique_login_count"))
                .willReturn(okJson("[]")));

        List<Object> result = stats.uniqueLoginCount(1000, 2000, IDP, "https://sp.example.org/shibboleth");

        assertNotNull(result);

        verify(getRequestedFor(urlPathEqualTo("/public/unique_login_count"))
                .withQueryParam("idp_id", equalTo(IDP))
                .withQueryParam("sp_id", equalTo("https://sp.example.org/shibboleth")));
    }

}
