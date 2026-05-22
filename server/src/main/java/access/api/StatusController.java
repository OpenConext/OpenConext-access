package access.api;


import access.ohdear.OhDearService;
import access.ohdear.StatusResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = {"/api/v1/status"}, produces = MediaType.APPLICATION_JSON_VALUE)
public class StatusController {

    private final OhDearService service;

    public StatusController(OhDearService service) {
        this.service = service;
    }

    @GetMapping
    public StatusResponse getStatus() {
        return service.getAggregatedStatus(60);
    }
}
