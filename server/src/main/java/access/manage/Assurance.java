package access.manage;

public record Assurance(String identityProviderId,
                        AssuranceEntity mfaEntity,
                        AssuranceEntity stepupEntity) {
}
