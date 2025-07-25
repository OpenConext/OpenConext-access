package access.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
