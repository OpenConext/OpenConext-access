package access.json;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CloningJsonSerializerTest {

    private final CloningJsonSerializer serializer = (CloningJsonSerializer) new CloningJsonSerializerSupplier().get();

    @Test
    void testCloneNull() {
        Object cloned = serializer.clone(null);
        assertNull(cloned);
    }

    @Test
    void testCloneString() {
        Object cloned = serializer.clone("test");
        assertEquals("test", cloned);
    }

    @Test
    void testCloneException() {
        assertThrows(IllegalArgumentException.class, () -> serializer.clone(new InnerObject("nope")));
    }

    private static class InnerObject {
        public InnerObject(String s) {
        }
    }

}