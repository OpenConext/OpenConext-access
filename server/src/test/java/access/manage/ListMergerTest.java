package access.manage;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ListMergerTest {


    @Test
    void threeWayMerge() {
        List<String> list1 = List.of("alpha", "beta", "gamma", "delta");

        // list2: changed "beta"→"BETA", removed "delta", added "epsilon"
        List<String> list2 = List.of("alpha", "BETA", "gamma", "epsilon");

        // list3: changed "alpha"→"ALPHA", changed "gamma"→"GAMMA"
        List<String> list3 = List.of("ALPHA", "beta", "GAMMA", "delta");

        List<String> list4 = ListMerger.threeWayMerge(list1, list2, list3);
        assertEquals(list4, List.of("ALPHA", "BETA", "GAMMA", "epsilon"));

        list1 = List.of("red1", "red2");

        // list2: changed "beta"→"BETA", removed "delta", added "epsilon"
        list2 = List.of("red1", "red2", "red3");

        // list3: changed "alpha"→"ALPHA", changed "gamma"→"GAMMA"
        list3 = List.of("red1", "red2", "red4");

        list4 = ListMerger.threeWayMerge(list1, list2, list3);
        assertEquals(list4, List.of("red1", "red2", "red3", "red4"));
    }


}