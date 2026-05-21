package access.manage;

import lombok.Getter;

import java.util.Arrays;

public enum StepUpType {
    loa1_5("http://test2.surfconext.nl/assurance/loa1.5"),
    loa2(  "http://test2.surfconext.nl/assurance/loa2"),
    loa3(  "http://test2.surfconext.nl/assurance/loa3");

    @Getter
    private final String level;

    StepUpType(String level) {
        this.level = level;
    }

    public int getRequiredLoaLevel() {
        return switch (this) {
            case loa1_5 -> 1;
            case loa2   -> 2;
            case loa3   -> 3;
        };
    }

    public static StepUpType fromLevel(String level) {
        return Arrays.stream(values())
                .filter(t -> t.level.equals(level))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown StepUpType level: " + level));
    }
}
