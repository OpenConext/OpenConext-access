package access.manipulation;

import org.springframework.expression.EvaluationException;
import org.springframework.expression.Expression;
import org.springframework.expression.spel.support.StandardEvaluationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SpelAttributeManipulationService implements AttributeManipulationService {


    public void apply(AttributeManipulation policy,
                      Map<String, List<String>> attributes,
                      String subjectId) {

        Expression expression = policy.getCompiledExpression();

        if (expression == null) {
            return;
        }
        AttributeScriptContext ctx = new AttributeScriptContext(attributes, subjectId);


        StandardEvaluationContext context = new StandardEvaluationContext(ctx);

        context.setTypeLocator(typeName -> {
            throw new EvaluationException("Type access not allowed");
        });

        expression.getValue(context);
    }
}
