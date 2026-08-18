package access.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.ConstructorDetector;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.datatype.hibernate7.Hibernate7Module;

@Configuration
public class ObjectMapperHolder {

    // Jackson 3 defaults java.time types to ISO-8601 strings (DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS
    // defaults to false, vs. true for a hand-built Jackson 2 ObjectMapper); enabling it here preserves
    // the numeric-timestamp wire format this app has always produced.
    public static final JsonMapper objectMapper = JsonMapper.builder()
            .changeDefaultPropertyInclusion(incl -> incl.withValueInclusion(JsonInclude.Include.NON_NULL))
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            // Jackson 3 defaults FAIL_ON_NULL_FOR_PRIMITIVES to true (Jackson 2 defaulted to false);
            // this app's API accepts JSON null for primitive boolean/int fields, so keep the lenient behavior.
            .configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false)
            .configure(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS, true)
            // Jackson 3's ConstructorDetector.DEFAULT now allows treating a non-default constructor as an
            // implicit properties-based creator even when a no-arg constructor also exists (Jackson 2 did
            // not). Several entities (e.g. JoinRequest) have a Lombok no-arg constructor plus a business
            // constructor whose parameter names happen to match JSON property names; without this, Jackson
            // picks the business constructor for deserialization instead of the no-arg + setters.
            .constructorDetector(ConstructorDetector.DEFAULT.withAllowImplicitWithDefaultConstructor(false))
            .addModule(new Hibernate7Module())
            .build();

    // Declared as JsonMapper (not ObjectMapper) so Boot's JacksonAutoConfiguration#jacksonJsonMapper,
    // which is @ConditionalOnMissingBean against the JsonMapper type, backs off instead of registering
    // its own competing @Primary bean.
    @Bean
    @Primary
    public JsonMapper objectMapper() {
        return objectMapper;
    }

}

