package access.json;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.exc.MismatchedInputException;

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
        // Jackson 3's ObjectMapper#convertValue no longer wraps failures as IllegalArgumentException
        // (that wrapping was Jackson 2-specific, needed because JsonMappingException was checked;
        // Jackson 3's JacksonException hierarchy is unchecked, so it propagates directly).
        assertThrows(MismatchedInputException.class, () -> serializer.clone(new InnerObject("nope")));
    }

    private static class InnerObject {
        public InnerObject(String s) {
        }
    }

}