package access.cron;

import net.javacrumbs.shedlock.core.LockConfiguration;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.core.SimpleLock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.sql.SQLTransactionRollbackException;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DeadlockLockProviderTest {

    private LockProvider delegate;
    private DeadlockLockProvider provider;
    private LockConfiguration config;

    @BeforeEach
    void setUp() {
        delegate = mock(LockProvider.class);
        provider = new DeadlockLockProvider(delegate);
        config = new LockConfiguration(Instant.now(), "test-lock", Duration.ofSeconds(30), Duration.ZERO);
    }

    @Test
    void delegateSucceeds_returnsLock() {
        SimpleLock lock = mock(SimpleLock.class);
        when(delegate.lock(config)).thenReturn(Optional.of(lock));

        Optional<SimpleLock> result = provider.lock(config);

        assertTrue(result.isPresent());
        assertSame(lock, result.get());
    }

    @Test
    void delegateReturnsEmpty_returnsEmpty() {
        when(delegate.lock(config)).thenReturn(Optional.empty());

        Optional<SimpleLock> result = provider.lock(config);

        assertFalse(result.isPresent());
    }

    @Test
    void deadlock_viaSQLTransactionRollbackException_returnsEmpty() {
        RuntimeException ex = new RuntimeException(new SQLTransactionRollbackException("Deadlock found"));
        when(delegate.lock(config)).thenThrow(ex);

        Optional<SimpleLock> result = provider.lock(config);

        assertFalse(result.isPresent());
    }

    @Test
    void deadlock_viaSQLExceptionErrorCode1213_returnsEmpty() {
        SQLException sqlEx = new SQLException("Deadlock found", "40001", 1213);
        RuntimeException ex = new RuntimeException(sqlEx);
        when(delegate.lock(config)).thenThrow(ex);

        Optional<SimpleLock> result = provider.lock(config);

        assertFalse(result.isPresent());
    }

    @Test
    void deadlock_nestedDeepInCauseChain_returnsEmpty() {
        // Wrap SQLTransactionRollbackException several levels deep
        Throwable root = new SQLTransactionRollbackException("Deadlock");
        Throwable level1 = new RuntimeException("wrapper1", root);
        RuntimeException level2 = new RuntimeException("wrapper2", level1);
        when(delegate.lock(config)).thenThrow(level2);

        Optional<SimpleLock> result = provider.lock(config);

        assertFalse(result.isPresent());
    }

    @Test
    void nonDeadlockException_returnsEmpty() {
        when(delegate.lock(config)).thenThrow(new RuntimeException("unexpected DB error"));

        Optional<SimpleLock> result = provider.lock(config);

        assertFalse(result.isPresent());
    }

    @Test
    void sqlExceptionWithDifferentErrorCode_isNotDeadlock_returnsEmpty() {
        // Error code 1205 (lock wait timeout) — not a deadlock, takes the non-deadlock branch
        SQLException sqlEx = new SQLException("Lock wait timeout", "HY000", 1205);
        when(delegate.lock(config)).thenThrow(new RuntimeException(sqlEx));

        Optional<SimpleLock> result = provider.lock(config);

        assertFalse(result.isPresent());
    }
}
