package access.manage;

import access.model.User;

import java.util.Map;

public interface PolicyAccessRights {

    default void confirmPolicyAccess(User user, PolicyDefinition policyDefinition, Manage manage) {
        if (user.isSuperUser()) {
            return;
        }
        //Is the IdP of the Policy the same as the IdP of the User?

        //No IdP, all SP's must be owned by the IdP of the user (=organizationGUID of the instituitonAdmin)
    }
}
