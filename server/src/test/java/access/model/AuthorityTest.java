package access.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthorityTest {

    @Test
    void isAllowed() {
        assertTrue(Authority.ADMIN.isAllowed(Authority.ADMIN));
        assertTrue(Authority.ADMIN.isAllowed(Authority.MEMBER));

        assertFalse(Authority.MEMBER.isAllowed(Authority.ADMIN));
    }
}