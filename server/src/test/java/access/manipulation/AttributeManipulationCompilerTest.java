package access.manipulation;

import org.junit.jupiter.api.Test;
import org.springframework.expression.Expression;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AttributeManipulationCompilerTest {

    private final AttributeManipulationCompiler compiler = new AttributeManipulationCompiler();

    @Test
    void shouldExecutePrecompiledExpression() {
        String script = "set('a', {'1'})";

        Expression compiled = compiler.compile(script);

        AttributeManipulation policy = new AttributeManipulation();
        policy.setScript(script);
        policy.setCompiledExpression(compiled);

        AttributeManipulationService service =
                new SpelAttributeManipulationService();

        Map<String, List<String>> attributes = new HashMap<>();

        service.apply(policy, attributes, "user");

        assertEquals(List.of("1"), attributes.get("a"));
    }

    @Test
    void shouldAcceptValidScript() {
        String script = """
                set('attr', {'value'})
                """;

        compiler.compile(script);
    }

    @Test
    void shouldFailOnSyntaxError() {
        String script = """
                set('attr', {'value'
                """;

        assertThrows(
                InvalidAttributePolicyException.class,
                () -> compiler.compile(script)
        );
    }

    @Test
    void shouldFailOnUnknownMethod() {
        String script = """
                unknownMethod('attr')
                """;

        assertThrows(
                InvalidAttributePolicyException.class,
                () -> compiler.compile(script)
        );
    }

    @Test
    void shouldFailOnJvmTypeAccess() {
        String script = """
                T(java.lang.Runtime).getRuntime()
                """;

        assertThrows(
                InvalidAttributePolicyException.class,
                () -> compiler.compile(script)
        );
    }

    @Test
    void shouldAllowSubjectIdUsage() {
        String script = """
                set('subject', {subjectId()})
                """;

        compiler.compile(script);
    }

    @Test
    void shouldAllowMapValuesHelper() {
        String script = """
                set(
                  'mapped',
                  mapValues('groups', {'a':'b'})
                )
                """;

        compiler.compile(script);
    }

}