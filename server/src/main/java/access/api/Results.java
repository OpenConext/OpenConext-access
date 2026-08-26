package access.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

public class Results {

    private Results() {
    }

    public static ResponseEntity<Map<String, Object>> createResult() {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("status", HttpStatus.CREATED.value()));
    }

    public static ResponseEntity<Map<String, Object>> okResult() {
        return ResponseEntity.status(HttpStatus.OK).body(Map.of("status", HttpStatus.OK.value()));
    }

    public static ResponseEntity<Map<String, Object>> deleteResult() {
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(Map.of("status", HttpStatus.NO_CONTENT.value()));
    }

    public static ResponseEntity<Map<String, Object>> forbiddenResult() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("status", HttpStatus.FORBIDDEN.value()));
    }
}
