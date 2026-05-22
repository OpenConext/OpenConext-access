package access.api;

import access.exception.UserRestrictionException;
import access.model.User;
import access.ohdear.OhDearService;
import access.ohdear.StatusResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/monitoring")
public class OhDearController {

    private final OhDearService ohDearService;

    @Autowired
    public OhDearController(OhDearService ohDearService) {
        this.ohDearService = ohDearService;
    }

    @GetMapping({ "","/"})
    public StatusResponse monitoring(@RequestParam(value = "period", required = false, defaultValue = "60") int period) {
        if (period > 365) {
            throw new UserRestrictionException("Period larger then 365 not allowed");
        }
        return ohDearService.getAggregatedStatus(period);
    }

}
