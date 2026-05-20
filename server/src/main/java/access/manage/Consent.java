package access.manage;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public record Consent(String identityProviderId,
                      String name,
                      ConsentType type,
                      @JsonProperty("explanation:en") String explanationEn,
                      @JsonProperty("explanation:nl") String explanationNl) {

    public Map<String, String> toManageMap() {
        return Map.of(
                "name", name,
                "type", type.name(),
                "explanation:en", explanationEn,
                "explanation:nl", explanationNl
        );
    }

    public void updateManageMap(Map<String, String> manageConsent) {
        manageConsent.putAll(toManageMap());
    }
}
