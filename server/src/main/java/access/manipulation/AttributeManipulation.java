package access.manipulation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.expression.Expression;

@Entity(name = "attribute_manipulations")
@NoArgsConstructor
@Getter
@Setter
public class AttributeManipulation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    @NotNull
    private String script;

    // not persisted
    private transient Expression compiledExpression;

    public AttributeManipulation(String script) {
        this.script = script;
    }
}
