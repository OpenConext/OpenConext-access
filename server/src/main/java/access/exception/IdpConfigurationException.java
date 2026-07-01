package access.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

@Getter
public class IdpConfigurationException extends ResponseStatusException {

    private final String reference;

    public IdpConfigurationException(HttpStatus status, String reason) {
        super(status, reason);
        this.reference = String.valueOf(Math.round(Math.random() * 10000));
    }

    @Override
    public String toString() {
        return "reference='" + reference + "' " + super.toString();
    }
}

