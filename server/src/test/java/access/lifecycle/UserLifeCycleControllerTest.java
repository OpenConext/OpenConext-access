package access.lifecycle;

import access.AbstractTest;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

class UserLifeCycleControllerTest extends AbstractTest {

    @Test
    void preview() {
        LifeCycleResult lifeCycleResult = given()
                .when()
                .auth().preemptive().basic("lifecycle", "secret")
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("sub", GUEST_SUB)
                .get("/api/external/v1/deprovision/{sub}")
                .as(new TypeRef<>() {
                });
        assertEquals("OK", lifeCycleResult.getStatus());
        assertEquals(GUEST_SUB, lifeCycleResult.getData().stream()
                .filter(attr -> attr.getName().equals("urn"))
                .map(attr -> attr.getValue())
                .toList()
                .getFirst());
    }

    @Test
    void lifeCycleForbidden() {
        given()
                .when()
                .auth().preemptive().basic("voot", "secret")
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("sub", GUEST_SUB)
                .get("/api/external/v1/deprovision/{sub}")
                .then()
                .statusCode(401);
    }

    @Test
    void dryRun() {
        LifeCycleResult lifeCycleResult = given()
                .when()
                .auth().preemptive().basic("lifecycle", "secret")
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("sub", GUEST_SUB)
                .delete("/api/external/v1/deprovision/{sub}/dry-run")
                .as(new TypeRef<>() {
                });
        assertEquals("OK", lifeCycleResult.getStatus());
        assertEquals(GUEST_SUB, lifeCycleResult.getData().stream()
                .filter(attr -> attr.getName().equals("urn"))
                .map(attr -> attr.getValue())
                .toList()
                .getFirst());
        assertTrue(userRepository.findBySubIgnoreCase(GUEST_SUB).isPresent());
    }

    @Test
    void deprovision() {
        LifeCycleResult lifeCycleResult = given()
                .when()
                .auth().preemptive().basic("lifecycle", "secret")
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("sub", GUEST_SUB)
                .delete("/api/external/v1/deprovision/{sub}")
                .as(new TypeRef<>() {
                });
        assertEquals("OK", lifeCycleResult.getStatus());
        assertEquals(GUEST_SUB, lifeCycleResult.getData().stream()
                .filter(attr -> attr.getName().equals("urn"))
                .map(attr -> attr.getValue())
                .toList()
                .getFirst());
        assertFalse(userRepository.findBySubIgnoreCase(GUEST_SUB).isPresent());
    }


}
