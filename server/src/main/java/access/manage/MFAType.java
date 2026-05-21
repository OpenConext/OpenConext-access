package access.manage;

import lombok.Getter;

public enum MFAType {

    multipleauthn("http://schemas.microsoft.com/claims/multipleauthn"),
           mfa( "https://refeds.org/profile/mfa"),
    mobileOneFactorContract("urn:oasis:names:tc:SAML:2.0:ac:classes:MobileOneFactorContract"),
    mobileOneFactorUnregistered("urn:oasis:names:tc:SAML:2.0:ac:classes:MobileOneFactorUnregistered"),
    password("urn:oasis:names:tc:SAML:2.0:ac:classes:Password"),
    transparentAuthnContext("transparent_authn_context"),
    linkedInstitution("https://eduid.nl/trust/linked-institution"),
    validateNames("https://eduid.nl/trust/validate-names"),
    validateNamesExternal("https://eduid.nl/trust/validate-names-external"),
    affiliationStudent("https://eduid.nl/trust/affiliation-student");

    @Getter
    private final String value;

    MFAType(String value) {
        this.value = value;
    }
}
