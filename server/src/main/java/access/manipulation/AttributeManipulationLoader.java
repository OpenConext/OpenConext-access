package access.manipulation;


import org.springframework.expression.Expression;

public class AttributeManipulationLoader {

    private final AttributeManipulationRepository repository;
    private final AttributeManipulationCompiler compiler;

    public AttributeManipulationLoader(AttributeManipulationRepository repository,
                                       AttributeManipulationCompiler compiler) {
        this.repository = repository;
        this.compiler = compiler;
    }

    public void loadAndCompilePolicies() {
        repository.findAll().forEach(policy -> {
            Expression compiled = compiler.compile(policy.getScript());
            policy.setCompiledExpression(compiled);
        });
    }
}
