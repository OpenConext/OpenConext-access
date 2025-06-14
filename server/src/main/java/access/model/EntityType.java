package access.model;

public enum EntityType {

    saml20_sp, oidc10_rp, saml20_idp;

    public String collectionName() {
        return name();
    }
}
