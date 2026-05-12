package access.model;

import lombok.Getter;

public enum ConnectionSectionFlags {

    TECHNICAL(1),       // 0001
    INFORMATION(1 << 1),  // 0010
    PRODUCTION_STATUS (1 << 2);  // 0100

    @Getter
    private final int value;

    ConnectionSectionFlags(int value) {
        this.value = value;
    }

    // Mark a section as complete
    public static int complete(int current, ConnectionSectionFlags flag) {
        return current | flag.value;
    }

    // Mark a section as incomplete
    public static int uncomplete(int current, ConnectionSectionFlags flag) {
        return current & ~flag.value;
    }

    // Check if a specific section is complete
    public static boolean isComplete(int current, ConnectionSectionFlags flag) {
        return (current & flag.value) != 0;
    }

    // Check if ALL sections are complete
    public static boolean allComplete(int current) {
        int all = TECHNICAL.value | INFORMATION.value | PRODUCTION_STATUS.value;
        return (current & all) == all;
    }
}
