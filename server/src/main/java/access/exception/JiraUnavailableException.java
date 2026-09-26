package access.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

//Thrown after the change request / entity that was supposed to accompany a Jira ticket has
//already been persisted (see JiraClient.JiraCreateResult#throwIfFailed) - callers must be
//marked @Transactional(noRollbackFor = JiraUnavailableException.class) so that persist is not
//undone by the rollback that would otherwise follow this exception out of the method
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class JiraUnavailableException extends BaseException {

    public JiraUnavailableException(Throwable cause) {
        super("Jira is currently unavailable: " + cause.getMessage());
        initCause(cause);
    }
}
