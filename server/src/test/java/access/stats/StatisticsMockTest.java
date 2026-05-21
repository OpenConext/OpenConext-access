package access.stats;

import access.manage.ConnectionProviderConverter;
import access.manage.LocalManage;
import access.model.State;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StatisticsMockTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StatisticsMock statistics = new StatisticsMock(new LocalManage(new ConnectionProviderConverter(objectMapper, State.testaccepted),
            objectMapper, "classpath:/manage"));

    @Test
    void loginTimeFrame() {
        List<Object> stats = statistics.loginTimeFrame(oneMonthAgo(), now(), Scale.month.name(), "http://mock-idp", "http://mock-sp", true);
        assertEquals(1001, stats.size());
    }

    @Test
    void loginAggregated() {
        List<Object> stats = statistics.loginAggregated("2026Q1", "http://mock-idp", "https://wiki", "sp_entity_id");
        assertEquals(1, stats.size());
    }

    @Test
    void uniqueLoginCount() {
        List<Object> stats = statistics.uniqueLoginCount(oneMonthAgo(), now(), "http://mock-idp", null);
        assertEquals(1, stats.size());
    }

    private long oneMonthAgo() {
        return System.currentTimeMillis() - (1000L * 60 * 60 * 24 * 30);
    }

    private long now() {
        return System.currentTimeMillis();
    }
}