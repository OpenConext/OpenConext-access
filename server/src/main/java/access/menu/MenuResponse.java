package access.menu;

import java.util.List;

/**
 * The menu model for one user: the names of the menu items the user is allowed to see, in the current organization.
 * Paths, icons and labels are client-side concerns.
 */
public record MenuResponse(List<String> menuItems,
                           List<OrganizationSummary> organizations,
                           OrganizationSummary currentOrganization,
                           UserSummary user) {

    public record OrganizationSummary(Long id, String name, String manageIdentifier) {
    }

    public record UserSummary(String name, boolean superUser) {
    }
}
