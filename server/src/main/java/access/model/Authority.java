package access.model;

import lombok.Getter;

public enum Authority {

    ADMIN(2), MEMBER(1), GUEST(0);

    @Getter
    private final int rights;

    Authority(int rights) {
        this.rights = rights;
    }

    public boolean isAllowed(Authority other) {
        return rights >= other.rights;
    }

}
