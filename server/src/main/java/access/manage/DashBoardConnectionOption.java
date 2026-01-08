package access.manage;

import lombok.Getter;

import java.util.Arrays;

public enum DashBoardConnectionOption {

    connectWithInteraction("connect_with_interaction"),
    connectWithoutInteractionWithEmail("connect_without_interaction_with_email"),
    connectWithoutInteractionWithoutEmail("connect_without_interaction_without_email");

    @Getter
    private final String value;

    DashBoardConnectionOption(String value) {
        this.value = value;
    }

    public static DashBoardConnectionOption fromValue(String value) {
        return Arrays.stream(DashBoardConnectionOption.values())
                .filter(option -> option.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No coin:dashboard_connect_option enum constant with value: " + value));
    }
}
