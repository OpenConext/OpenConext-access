package access.lifecycle;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
public class LifeCycleResult {

  private final String status = "OK";
  private final String name = "OpenConext-access-server";
  @Setter
  private List<Attribute> data = new ArrayList<>();

}
