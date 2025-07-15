package access.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class InvitationForm {

    private Language language;

    private List<String> invites;

    private String message;

    private Authority intendedAuthority = Authority.MEMBER;

    private Long organizationId;

    private Set<Long> applicationIdentifiers = new HashSet<>();
}
