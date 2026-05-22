package access.api;

import access.AbstractTest;
import access.ohdear.StatusResponse;
import io.restassured.http.ContentType;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;

import java.nio.charset.Charset;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class OhDearControllerTest extends AbstractTest {

    @Test
    void monitoringDefaultPeriod() throws Exception {
        stubOhDear();

        StatusResponse response = given()
                .when()
                .accept(ContentType.JSON)
                .get("/api/v1/monitoring")
                .then()
                .statusCode(HttpStatus.OK.value())
                .extract()
                .as(StatusResponse.class);

        assertNotNull(response);
        assertNotNull(response.overallStatus());
        assertNotNull(response.groups());
    }

    @Test
    void monitoringExplicitPeriod() throws Exception {
        stubOhDear();

        StatusResponse response = given()
                .when()
                .accept(ContentType.JSON)
                .queryParam("period", 30)
                .get("/api/v1/monitoring")
                .then()
                .statusCode(HttpStatus.OK.value())
                .extract()
                .as(StatusResponse.class);

        assertNotNull(response);
    }

    @Test
    void monitoringMaxPeriod() throws Exception {
        stubOhDear();

        StatusResponse response = given()
                .when()
                .accept(ContentType.JSON)
                .queryParam("period", 365)
                .get("/api/v1/monitoring")
                .then()
                .statusCode(HttpStatus.OK.value())
                .extract()
                .as(StatusResponse.class);

        assertNotNull(response);
    }

    @Test
    void monitoringPeriodExceeded() {
        given()
                .when()
                .accept(ContentType.JSON)
                .queryParam("period", 366)
                .get("/api/v1/monitoring")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    private void stubOhDear() throws Exception {
        String monitorsJson = IOUtils.toString(
                new ClassPathResource("ohdear/monitors_operational.json").getInputStream(),
                Charset.defaultCharset());
        String uptimeJson = IOUtils.toString(
                new ClassPathResource("ohdear/uptime_array.json").getInputStream(),
                Charset.defaultCharset());
        String downtimeJson = IOUtils.toString(
                new ClassPathResource("ohdear/downtime.json").getInputStream(),
                Charset.defaultCharset());

        stubFor(get(urlEqualTo("/monitors"))
                .willReturn(okJson(monitorsJson)));
        stubFor(get(urlPathMatching("/monitors/.*/uptime.*"))
                .willReturn(okJson(uptimeJson)));
        stubFor(get(urlPathMatching("/monitors/.*/downtime.*"))
                .willReturn(okJson(downtimeJson)));
    }
}
