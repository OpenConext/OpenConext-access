package access.menu;

import access.config.Config;
import access.config.Feature;
import access.model.Authority;
import access.model.Organization;
import access.model.OrganizationMembership;
import access.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Single source of truth for the visibility of the menu items in the SURF Access shell. Both the Access client and
 * (through the Invite server) the Invite client render their menu from the result.
 */
@Service
@EnableConfigurationProperties(Config.class)
public class MenuService {

    public static final String HOME = "home";
    public static final String USERS = "users";
    public static final String IDP = "idp";
    public static final String YOUR_APPS = "yourApps";
    public static final String CATALOGUE = "catalogue";
    public static final String POLICIES = "policies";
    public static final String ACCESSIBLE_APPS = "accessibleApps";
    public static final String INVITE = "invite";
    public static final String SRAM = "sram";
    public static final String SERVICE_DESK = "serviceDesk";
    public static final String FEEDBACK = "feedback";
    public static final String STATISTICS = "statistics";

    private final Config config;

    @Autowired
    public MenuService(Config config) {
        this.config = config;
    }

    public MenuResponse menu(User user, String organizationId) {
        List<OrganizationMembership> memberships = user.getOrganizationMemberships().stream()
            .sorted(Comparator.comparing(OrganizationMembership::getId, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        List<MenuResponse.OrganizationSummary> organizations = memberships.stream()
            .map(OrganizationMembership::getOrganization)
            .map(MenuService::summary)
            .toList();
        Optional<Organization> current = currentOrganization(memberships, organizationId);
        List<String> menuItems = filterDisabledFeatures(menuItemsForUser(user, current.orElse(null)));
        return new MenuResponse(
            menuItems,
            organizations,
            current.map(MenuService::summary).orElse(null),
            new MenuResponse.UserSummary(user.getName(), user.isSuperUser()));
    }

    /**
     * The requested organization (id or manageIdentifier) when the user is a member, otherwise the first membership.
     */
    private Optional<Organization> currentOrganization(List<OrganizationMembership> memberships, String organizationId) {
        List<Organization> organizations = memberships.stream().map(OrganizationMembership::getOrganization).toList();
        if (StringUtils.hasText(organizationId)) {
            Optional<Organization> requested = organizations.stream()
                .filter(o -> String.valueOf(o.getId()).equals(organizationId) || organizationId.equals(o.getManageIdentifier()))
                .findFirst();
            if (requested.isPresent()) {
                return requested;
            }
        }
        return organizations.stream().findFirst();
    }

    private List<String> menuItemsForUser(User user, Organization currentOrganization) {
        //Every user has access to the home, catalogue and help menu items
        List<String> items = new ArrayList<>(List.of(HOME, CATALOGUE, SERVICE_DESK));
        if (!config.isFeedbackWidgetEnabled()) {
            items.add(FEEDBACK);
        }
        if (currentOrganization == null) {
            return items;
        }
        //Only the memberships of the current organization matter, the user can have other authorities elsewhere
        Set<Authority> authorities = user.getOrganizationMemberships().stream()
            .filter(m -> currentOrganization.getId().equals(m.getOrganization().getId()))
            .map(OrganizationMembership::getAuthority)
            .collect(java.util.stream.Collectors.toSet());
        boolean onlyGuest = !authorities.isEmpty() && authorities.stream().allMatch(a -> a == Authority.GUEST);
        if (onlyGuest) {
            items.add(YOUR_APPS);
            return items;
        }
        boolean isMember = authorities.contains(Authority.MEMBER);
        boolean isAdmin = authorities.contains(Authority.ADMIN);
        if (isMember || isAdmin) {
            items.addAll(List.of(IDP, USERS, YOUR_APPS));
        }
        boolean isInstitution = StringUtils.hasText(currentOrganization.getManageIdentifier());
        if (isInstitution) {
            items.addAll(List.of(ACCESSIBLE_APPS, INVITE, SRAM));
        }
        if ((isAdmin || user.isSuperUser()) && isInstitution) {
            items.addAll(List.of(STATISTICS, POLICIES));
        }
        return items;
    }

    private List<String> filterDisabledFeatures(List<String> items) {
        Set<String> disabled = config.getFeatures() == null ? Set.of() : config.getFeatures().stream()
            .filter(feature -> !feature.enabled())
            .map(Feature::name)
            .map(Enum::name)
            .collect(java.util.stream.Collectors.toSet());
        return items.stream().filter(item -> !disabled.contains(item)).toList();
    }

    private static MenuResponse.OrganizationSummary summary(Organization organization) {
        return new MenuResponse.OrganizationSummary(organization.getId(), organization.getName(), organization.getManageIdentifier());
    }
}
