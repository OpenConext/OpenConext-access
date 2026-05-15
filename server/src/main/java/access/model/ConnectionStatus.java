package access.model;

public enum ConnectionStatus {

        OPEN, //not saved to Manage yet
        COMPLETE, // all required sections are completed
        PENDING_PROD, // pending the approval of the production ready status
        PROD_READY // All set, production ready for business
}
