package access.api;

import access.AbstractTest;
import access.AccessCookieFilter;
import access.model.Contract;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings({"unchecked", "unsafe"})
class ContractControllerTest extends AbstractTest {

    @Test
    void getContract() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

        Contract contract = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .get("/api/v1/contracts/{applicationId}")
                .then()
                .statusCode(HttpStatus.OK.value())
                .extract()
                .as(Contract.class);

        assertEquals("John Doe", contract.getSigneeName());
        assertEquals("jdoe@example.com", contract.getEmail());
        assertFalse(contract.isSignedContract());
    }

    @Test
    void getContractNotFound() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Long applicationId = seedIdentifiers.get(NITRO_MAP);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .get("/api/v1/contracts/{applicationId}")
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    void unsignedContracts() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);

        List<Contract> contracts = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/contracts/unsigned")
                .then()
                .statusCode(HttpStatus.OK.value())
                .extract()
                .as(new TypeRef<>() {
                });

        assertEquals(1, contracts.size());
        Contract contract = contracts.getFirst();
        assertEquals("John Doe",contract.getSigneeName());
        assertNotNull(contract.getApplication().getId());
    }

    @Test
    void unsignedContractsNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .get("/api/v1/contracts/unsigned")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    void createContractSavesJiraKey() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

        // Remove the seeded contract so we can POST a fresh one
        contractRepository.deleteAll(contractRepository.findAll());

        Map<String, Object> contractData = Map.of(
                "signeeName", "Jane Smith",
                "email", "jsmith@example.com",
                "providerName", "SURF bv",
                "applicationName", "BuddyCheck",
                "application", Map.of("id", applicationId)
        );

        Contract created = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .body(contractData)
                .post("/api/v1/contracts/{applicationId}")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .extract()
                .as(Contract.class);

        assertNotNull(created.getTicketKey());
        assertTrue(created.getTicketKey().startsWith("CXT-"));

        Contract fromDb = contractRepository.findByApplicationId(applicationId).orElseThrow();
        assertEquals(created.getTicketKey(), fromDb.getTicketKey());
    }

    @Test
    void updateContractSigned() {
        // Only super users may set signedContract = true
        AccessCookieFilter accessCookieFilter = mockLoginFlow(SUPER_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

        Contract contract = contractRepository.findByApplicationId(applicationId).get();
        Map<String, Object> contractData = objectMapper.convertValue(contract, new TypeReference<>() {
        });
        contractData.put("application", Map.of("id", applicationId));
        contractData.put("signedContract", true);

        Contract updated = given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .body(contractData)
                .put("/api/v1/contracts/{applicationId}")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .extract()
                .as(Contract.class);

        assertTrue(updated.isSignedContract());

        Contract fromDb = contractRepository.findByApplicationId(applicationId).get();
        assertTrue(fromDb.isSignedContract());
    }

    @Test
    void updateContractSignedNotAllowedForNonSuperUser() {
        // A regular org ADMIN must not be able to set signedContract = true
        AccessCookieFilter accessCookieFilter = mockLoginFlow(MANAGE_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

        Contract contract = contractRepository.findByApplicationId(applicationId).get();
        Map<String, Object> contractData = objectMapper.convertValue(contract, new TypeReference<>() {
        });
        contractData.put("application", Map.of("id", applicationId));
        contractData.put("signedContract", true);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .body(contractData)
                .put("/api/v1/contracts/{applicationId}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());

        // Verify it was NOT signed in the DB
        Contract fromDb = contractRepository.findByApplicationId(applicationId).get();
        assertFalse(fromDb.isSignedContract());
    }

    @Test
    void updateContractNotAllowed() {
        AccessCookieFilter accessCookieFilter = mockLoginFlow(GUEST_SUB);
        Long applicationId = seedIdentifiers.get(BUDDY_CHECK);

        Contract contract = contractRepository.findByApplicationId(applicationId).get();
        Map<String, Object> contractData = objectMapper.convertValue(contract, new TypeReference<>() {
        });
        contractData.put("application", Map.of("id", applicationId));
        contractData.put("signedContract", true);

        given()
                .when()
                .filter(accessCookieFilter.cookieFilter())
                .header(csrfHeader(accessCookieFilter))
                .accept(ContentType.JSON)
                .contentType(ContentType.JSON)
                .pathParam("applicationId", applicationId)
                .body(contractData)
                .put("/api/v1/contracts/{applicationId}")
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }
}

