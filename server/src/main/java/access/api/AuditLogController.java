package access.api;

import access.audit.AuditCategory;
import access.audit.AuditEvent;
import access.audit.AuditEventRepository;
import access.audit.AuditStatus;
import access.audit.CertificateExpiry;
import access.audit.ChangeRequestReconciler;
import access.exception.NotFoundException;
import access.manage.Manage;
import access.model.EntityType;
import access.model.Authority;
import access.model.Organization;
import access.model.User;
import access.repository.JoinRequestRepository;
import access.repository.OrganizationRepository;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static access.SwaggerOpenIdConfig.API_TOKENS_SCHEME_NAME;
import static access.SwaggerOpenIdConfig.OPEN_ID_SCHEME_NAME;

@RestController
@RequestMapping(value = {"/api/v1/audit-log"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Transactional(readOnly = true)
@SecurityRequirement(name = OPEN_ID_SCHEME_NAME, scopes = {"openid"})
@SecurityRequirement(name = API_TOKENS_SCHEME_NAME)
public class AuditLogController implements UserAccessRights {

    private static final Log LOG = LogFactory.getLog(AuditLogController.class);
    private static final int MAX_PAGE_SIZE = 100;

    private final AuditEventRepository auditEventRepository;
    private final OrganizationRepository organizationRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final ChangeRequestReconciler changeRequestReconciler;
    private final Manage manage;

    public AuditLogController(AuditEventRepository auditEventRepository,
                              OrganizationRepository organizationRepository,
                              JoinRequestRepository joinRequestRepository,
                              ChangeRequestReconciler changeRequestReconciler,
                              Manage manage) {
        this.changeRequestReconciler = changeRequestReconciler;
        this.manage = manage;
        this.auditEventRepository = auditEventRepository;
        this.organizationRepository = organizationRepository;
        this.joinRequestRepository = joinRequestRepository;
    }

    @GetMapping({"", "/"})
    public ResponseEntity<Page<AuditEvent>> search(@Parameter(hidden = true) User user,
                                                   @RequestParam("organizationId") Long organizationId,
                                                   @RequestParam(value = "from", required = false) Instant from,
                                                   @RequestParam(value = "to", required = false) Instant to,
                                                   @RequestParam(value = "actorId", required = false) Long actorId,
                                                   @RequestParam(value = "category", required = false) AuditCategory category,
                                                   @RequestParam(value = "query", required = false) String query,
                                                   @RequestParam(value = "pageNumber", defaultValue = "0") int pageNumber,
                                                   @RequestParam(value = "pageSize", defaultValue = "25") int pageSize) {
        LOG.debug("/audit-log by " + user.getEmail());
        Organization organization = institutionAdminOrganization(user, organizationId);
        changeRequestReconciler.reconcile(organization, false);

        String pattern = StringUtils.hasText(query) ? "%" + query.trim().toLowerCase(Locale.ROOT) + "%" : null;
        PageRequest pageRequest = PageRequest.of(Math.max(pageNumber, 0), Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE));
        Page<AuditEvent> events = auditEventRepository.search(organization.getId(), start(from), end(to),
                actorId, category, pattern, pageRequest);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(@Parameter(hidden = true) User user,
                                                       @RequestParam("organizationId") Long organizationId,
                                                       @RequestParam(value = "from", required = false) Instant from,
                                                       @RequestParam(value = "to", required = false) Instant to) {
        Organization organization = institutionAdminOrganization(user, organizationId);
        changeRequestReconciler.reconcile(organization, false);

        Map<String, Object> result = new HashMap<>();
        for (AuditCategory category : AuditCategory.values()) {
            result.put(category.name(), 0L);
        }
        auditEventRepository.countByCategory(organization.getId(), start(from), end(to))
                .forEach(row -> result.put(((AuditCategory) row[0]).name(), row[1]));
        //Items that wait for an action of the admin are not bound to the period
        List<Map<String, Object>> attention = attention(organization);
        result.put("attention", attention);
        result.put(AuditCategory.PENDING.name(), joinRequestRepository.findByOrganization(organization).size()
                + auditEventRepository.countByOrganizationIdAndStatus(organization.getId(), AuditStatus.PENDING)
                + attention.size());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/actors")
    public ResponseEntity<List<Map<String, Object>>> actors(@Parameter(hidden = true) User user,
                                                            @RequestParam("organizationId") Long organizationId) {
        Organization organization = institutionAdminOrganization(user, organizationId);
        List<Map<String, Object>> actors = auditEventRepository.actors(organization.getId()).stream()
                .map(row -> Map.of("id", row[0], "name", row[1] == null ? "" : row[1]))
                .toList();
        return ResponseEntity.ok(actors);
    }

    //Derived from the IdP metadata at request time: a certificate that expires is a state, not an event
    private List<Map<String, Object>> attention(Organization organization) {
        if (!StringUtils.hasText(organization.getManageIdentifier())) {
            return List.of();
        }
        try {
            Map<String, Object> identityProvider = manage.providerByManageIdentifier(EntityType.saml20_idp,
                    organization.getManageIdentifier());
            return CertificateExpiry.expiringSoon(identityProvider, Instant.now()).stream()
                    .map(expiresAt -> Map.<String, Object>of("type", "CERTIFICATE_EXPIRING", "expiresAt", expiresAt.toString()))
                    .toList();
        } catch (RuntimeException e) {
            LOG.warn("Could not determine the certificates of " + organization.getName() + ": " + e.getMessage());
            return List.of();
        }
    }

    private Organization institutionAdminOrganization(User user, Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        confirmOrganizationMembership(user, organization, Authority.ADMIN);
        return organization;
    }

    private Instant start(Instant from) {
        return from != null ? from : Instant.now().minus(7, ChronoUnit.DAYS);
    }

    private Instant end(Instant to) {
        return to != null ? to : Instant.now().plus(1, ChronoUnit.DAYS);
    }

}
