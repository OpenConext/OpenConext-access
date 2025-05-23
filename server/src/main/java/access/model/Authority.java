package access.model;

import lombok.Getter;

public enum Authority {

    OWNER(2), MANAGER(1), GUEST(0);

    @Getter
    private final int rights;

    Authority(int rights) {
        this.rights = rights;
    }

}
