package access.manage;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ListMergerTest {


    @Test
    void threeWayMerge() {
        List<String> base = List.of("alpha", "beta", "gamma", "delta");

        // left: changed "beta"→"BETA", removed "delta", added "epsilon"
        List<String> left = List.of("alpha", "BETA", "gamma", "epsilon");

        // right: changed "alpha"→"ALPHA", changed "gamma"→"GAMMA"
        List<String> right = List.of("ALPHA", "beta", "GAMMA", "delta");

        List<String> list4 = ListMerger.threeWayMerge(base, left, right);
        assertEquals(List.of("ALPHA", "BETA", "GAMMA", "epsilon"), list4);

        base = List.of("red1", "red2");

        // left: changed "beta"→"BETA", removed "delta", added "epsilon"
        left = List.of("red1", "red2", "red3");

        // right: changed "alpha"→"ALPHA", changed "gamma"→"GAMMA"
        right = List.of("red1", "red2", "red4");

        list4 = ListMerger.threeWayMerge(base, left, right);
        assertEquals(List.of("red1", "red2", "red3", "red4"), list4);
    }

    @Test
    void threeWayMergeDuplicates() {
        List<String> base = List.of("a");
        List<String> left = List.of("a", "b");
        List<String> right = List.of("c", "b", "b", "b");

        List<String> list4 = ListMerger.threeWayMerge(base, left, right);
        assertEquals(List.of("c","b"), list4);
    }
}