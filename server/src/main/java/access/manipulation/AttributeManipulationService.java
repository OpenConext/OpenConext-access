package access.manipulation;

import java.util.List;
import java.util.Map;

public interface AttributeManipulationService {

    void apply(AttributeManipulation policy,
               Map<String, List<String>> attributes,
               String subjectId);
}
