package access.model;

public enum Authority {

    OWNER(2), MANAGER(1), GUEST(0);

    private final int rights;

    Authority(int rights) {
        this.rights = rights;
    }

}
