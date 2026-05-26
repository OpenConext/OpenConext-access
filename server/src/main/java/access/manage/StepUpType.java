package access.manage;

import java.util.List;

public enum StepUpType {

    loa1_5, loa2, loa3;

    public int getRequiredLoaLevel() {
        return switch (this) {
            case loa1_5 -> 1;
            case loa2 -> 2;
            case loa3 -> 3;
        };
    }

    public static StepUpType fromLevel(List<String> acrValues, String level) {
        if (!acrValues.contains(level)) {
            throw new IllegalArgumentException("Unknown StepUpType level: " + level);
        }

        String lastChar = level.substring(level.length() - 1);
        return switch (lastChar) {
            case "2" -> loa2;
            case "3" -> loa3;
            default -> loa1_5;
        };

    }
}
