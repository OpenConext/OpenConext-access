package access.manipulation;

import org.springframework.expression.EvaluationException;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AttributeManipulationCompiler {

    private final ExpressionParser parser = new SpelExpressionParser();

    public Expression compile(String script) {

        if (script == null || script.isBlank()) {
            return null;
        }

        try {
            Expression expression = parser.parseExpression(script);

            // validation execution with dummy data
            Map<String, List<String>> dummyAttributes = new HashMap<>();
            AttributeScriptContext ctx =
                    new AttributeScriptContext(dummyAttributes, "test-user");

            StandardEvaluationContext context =
                    new StandardEvaluationContext(ctx);

            context.setTypeLocator(typeName -> {
                throw new EvaluationException("Type access not allowed");
            });

            expression.getValue(context);

            return expression;

        } catch (RuntimeException e) {
            throw new InvalidAttributePolicyException("Invalid script", e);
        }
    }
}
