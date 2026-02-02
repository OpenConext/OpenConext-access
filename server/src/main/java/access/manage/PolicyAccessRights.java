package access.manage;

import access.exception.UserRestrictionException;
import access.model.User;

import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static access.manage.ManageData.getData;

public interface PolicyAccessRights {

    @SuppressWarnings("unchecked")
    default void confirmPolicyAccess(User user,
                                     PolicyDefinition policyDefinition,
                                     Manage manage) {
        if (user.isSuperUser()) {
            return;
        }
        List<String> authenticatingAuthority = List.of(user.getAuthenticatingAuthority());
        //Is the IdP of the Policy the same as the IdP of the User?
        if (!policyDefinition.getIdentityProviderIds().stream()
                .map(policyProvider -> policyProvider.getName())
                .toList()
                .equals(authenticatingAuthority)) {
            throwUserRestrictionException(user, policyDefinition);
        }
        //All SP's must be linked to the IdP of the user (=authenticatingAuthority of the User)
        List<String> serviceProviderIdentifiers = policyDefinition.getServiceProviderIds().stream()
                .map(policyProvider -> policyProvider.getName())
                .toList();
        Map<String, Object> identityProvider = manage.identityProviderByEntityID(user.getAuthenticatingAuthority());
        Map<String, Object> data = getData(identityProvider);
        List<String> allowedEntities = ((List<Map<String, String>>) data.getOrDefault("allowedEntities", List.of()))
                .stream()
                .map(allowedEntry -> allowedEntry.get("name"))
                .toList();
        if (!new HashSet<>(allowedEntities).containsAll(serviceProviderIdentifiers)) {
            throwUserRestrictionException(user, policyDefinition);
        }
    }

    default void throwUserRestrictionException(User user,
                                               PolicyDefinition policyDefinition) {
        throw new UserRestrictionException(
                String.format("User %s from %s is not allowed access to policy %s",
                        user.getEmail(), user.getAuthenticatingAuthority(), policyDefinition.getIdentityProviderIds()));
    }
}
