package access.stats;

import java.util.List;
import java.util.Optional;

public interface Statistics {

    List<Object> loginTimeFrame(long from, long to, String scale, String idpEntityId, String spEntityId);

    List<Object> loginAggregated(String period, String idpEntityId, String spEntityId);

    List<Object> uniqueLoginCount(long from, long to, String idpEntityId, String spEntityId);

}

