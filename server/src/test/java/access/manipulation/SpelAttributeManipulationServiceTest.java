package access.manipulation;


import org.junit.jupiter.api.Test;
import org.springframework.expression.Expression;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class SpelAttributeManipulationServiceTest {

    private final AttributeManipulationCompiler compiler = new AttributeManipulationCompiler();
    private final SpelAttributeManipulationService service = new SpelAttributeManipulationService();

    @Test
    void shouldMapAttributeValues() {
        Map<String, List<String>> attributes = new HashMap<>();

        attributes.put(
                "urn:mace:dir:attribute-def:isMemberOf",
                List.of("old-value", "other")
        );

        String script = """
                set(
                  'urn:mace:dir:attribute-def:isMemberOf',
                  mapValues(
                    'urn:mace:dir:attribute-def:isMemberOf',
                    {'old-value':'new-value'}
                  )
                )
                """;

        service.apply(compilePolicy(script), attributes, "user123");

        List<String> result =
                attributes.get("urn:mace:dir:attribute-def:isMemberOf");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("new-value", result.getFirst());
    }

    @Test
    void shouldLeaveAttributesUntouchedWhenNoMatch() {
        Map<String, List<String>> attributes = new HashMap<>();

        attributes.put("attr", List.of("a", "b"));

        String script = """
                set('attr', mapValues('attr', {'x':'y'}))
                """;

        service.apply(compilePolicy(script), attributes, "user123");

        List<String> result = attributes.get("attr");

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void shouldExposeSubjectId() {
        Map<String, List<String>> attributes = new HashMap<>();

        String script = """
                set('subject', {subjectId()})
                """;

        service.apply(compilePolicy(script), attributes, "the-user");

        List<String> subject = attributes.get("subject");

        assertNotNull(subject);
        assertEquals(1, subject.size());
        assertEquals("the-user", subject.getFirst());
    }

    @Test
    void shouldCacheCompiledExpression() {
        Map<String, List<String>> attributes = new HashMap<>();

        String script = "set('a', {'1'})";

        AttributeManipulation policy = compilePolicy(script);
        service.apply(policy, attributes, "user1");
        service.apply(policy, attributes, "user2");

        List<String> result = attributes.get("a");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("1", result.getFirst());
    }

    @Test
    void shouldBlockJvmTypeAccess() {
        Map<String, List<String>> attributes = new HashMap<>();

        String maliciousScript = """
                T(java.lang.Runtime).getRuntime().exec('calc')
                """;

        InvalidAttributePolicyException ex = assertThrows(
                InvalidAttributePolicyException.class,
                () -> service.apply(compilePolicy(maliciousScript), attributes, "user")
        );

        assertTrue(ex.getMessage().contains("Invalid script"));
    }

    @Test
    void shouldRemoveAttribute() {
        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("attr", List.of("value"));

        String script = "remove('attr')";

        service.apply(compilePolicy(script), attributes, "user");

        assertFalse(attributes.containsKey("attr"));
    }

    @Test
    void shouldSetAttribute() {
        Map<String, List<String>> attributes = new HashMap<>();

        String script = "set('uid', {subjectId()})";

        service.apply(compilePolicy(script), attributes, "user");

        assertEquals(1, attributes.size());
        assertEquals(List.of("user"), attributes.get("uid"));
    }

    @Test
    void convertMemberOf() {
        Map<String, List<String>> attributes = new HashMap<>();

        attributes.put(
                "urn:mace:dir:attribute-def:isMemberOf",
                List.of("urn:mace:surf.nl:role:networkadmin", "urn:mace:surf.nl:role:auditor")
        );

        String script = """
                {
                set(
                  'roles',
                  mapValues(
                    'urn:mace:dir:attribute-def:isMemberOf',
                    {
                      'urn:mace:surf.nl:role:networkadmin':'network-admin',
                      'urn:mace:surf.nl:role:helpdesk':'helpdesk',
                      'urn:mace:surf.nl:role:auditor':'auditor'
                    }
                  )
                ),
                remove('urn:mace:dir:attribute-def:isMemberOf')
                }
                """;

        service.apply(compilePolicy(script), attributes, "user");

        assertEquals(1, attributes.size());
        assertEquals(List.of("auditor", "network-admin"),attributes.get("roles").stream().sorted().toList());
    }

    private AttributeManipulation compilePolicy(String script) {
        AttributeManipulation policy = new AttributeManipulation(script);
        Expression compiled = compiler.compile(policy.getScript());
        policy.setCompiledExpression(compiled);
        return policy;
    }
}
