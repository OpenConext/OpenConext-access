package access.audit;

/**
 * Only used by the events about a Manage change request. A change request starts as PENDING and ends in one of the
 * other states, RESOLVED means it was closed in Manage and the outcome could not be determined.
 */
public enum AuditStatus {
    PENDING, APPLIED, REJECTED, CANCELLED, RESOLVED
}
