package access.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
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
        HttpServletRequest request =
            ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        String xff = request.getHeader("X-Forwarded-For");
        String ip = (xff != null && !xff.isBlank())
            ? xff.split(",")[0].trim()   // first entry = original client
            : request.getRemoteAddr();
        return String.format("reference='%s', IP-address=%s, msg:%s", reference, ip, super.toString());
    }
}

