package access.manage;

import access.exception.UserRestrictionException;
import access.model.User;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PolicyAccessRightsTest {

    private final PolicyAccessRights policyAccessRights = new PolicyAccessRights() {
    };
    private final Manage manage = mock(Manage.class);

    @Test
    void confirmPolicyAccess() {
        String authenticatingAuthority = "http://mock-idp";
        String policySPIdentifier = "http://mock-sp";
        User user = new User(false, Map.of(
                "authenticating_authority", authenticatingAuthority
        ));
        PolicyDefinition policyDefinition = new PolicyDefinition();
        policyDefinition.setServiceProviderIds(List.of(new PolicyProvider(policySPIdentifier)));

        when(manage.identityProviderByEntityID(user.getAuthenticatingAuthority()))
                .thenReturn(this.identityProvider());

        //The IdP of the Policy is not the same as the IdP of the User
        assertThrows(UserRestrictionException.class, () -> policyAccessRights.confirmPolicyAccess(user, policyDefinition, manage));

        when(manage.identityProviderByEntityID(user.getAuthenticatingAuthority()))
                .thenReturn(this.identityProvider("nope"));
        //The SP is not linked to the IdP of the user (=authenticatingAuthority of the User)
        assertThrows(UserRestrictionException.class, () -> policyAccessRights.confirmPolicyAccess(user, policyDefinition, manage));

        policyDefinition.setIdentityProviderIds(List.of(new PolicyProvider(user.getAuthenticatingAuthority())));
        when(manage.identityProviderByEntityID(user.getAuthenticatingAuthority()))
                .thenReturn(this.identityProvider(policySPIdentifier));
        policyAccessRights.confirmPolicyAccess(user, policyDefinition, manage);
    }

    @Test
    void confirmPolicyAccessSuperUser() {
        User user = new User(true, Map.of());
        PolicyDefinition policyDefinition = new PolicyDefinition();
        policyAccessRights.confirmPolicyAccess(user, policyDefinition, manage);
    }

    private Map<String, Object> identityProvider(String... allowedEntities) {
        return Map.of("data", Map.of(
                "allowedEntities", Stream.of(allowedEntities)
                        .map(allowedEntity -> Map.of("name", allowedEntity))
                        .toList()
        ));
    }
}