package access.model;

public enum ConnectionStatus {

        OPEN, //not saved to Manage yet
        IN_PROGRESS, //saved to Manage, but missing parts
        COMPLETE, // all required sections are completed
        PENDING_PROD, // pending the approval of the production ready status
        PROD_READY // All set, production ready for business
}
