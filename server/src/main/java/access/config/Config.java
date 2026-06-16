package access.config;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "config")
@Getter
@Setter
@NoArgsConstructor
public class Config {

    private String clientUrl;
    private String baseUrl;
    private List<String> externalSchacHomeOrganizations;
    private List<String> ownerSchacHomeOrgs;
    private String name;
    private String sram;
    private String invite;
    private String serviceDesk;
    private String discovery;
    private boolean authenticated;
    private boolean testEnvironment;
    private List<String> missingAttributes;
    private Map<String, Integer> stats;
    private List<Map<String, String>> identityProviders;
    private String idpProxyMetaData;
    private List<Feature> features;
    private List<String> acrValues;
    private String minimalStepupAcrLevel;
    private boolean feedbackWidgetEnabled;
    private boolean demoSeedEnabled;
    private String jiraBrowseBaseUrl;

    public Config(Config base) {
        this.clientUrl = base.clientUrl;
        this.baseUrl = base.baseUrl;
        this.discovery = base.discovery;
        this.externalSchacHomeOrganizations = base.externalSchacHomeOrganizations;
        this.ownerSchacHomeOrgs = base.ownerSchacHomeOrgs;
        this.invite = base.invite;
        this.sram = base.sram;
        this.serviceDesk = base.serviceDesk;
        this.identityProviders = base.identityProviders;
        this.idpProxyMetaData = base.idpProxyMetaData;
        this.features = base.features;
        this.acrValues = base.acrValues;
        this.minimalStepupAcrLevel = base.minimalStepupAcrLevel;
        this.feedbackWidgetEnabled = base.feedbackWidgetEnabled;
        this.demoSeedEnabled = base.demoSeedEnabled;
        this.jiraBrowseBaseUrl = base.jiraBrowseBaseUrl;
        this.testEnvironment = base.testEnvironment;
    }

    public Config withAuthenticated(boolean authenticated) {
        this.setAuthenticated(authenticated);
        return this;
    }

    public Config withName(String name) {
        this.setName(name);
        return this;
    }

    public Config withMissingAttributes(List<String> missingAttributes) {
        this.setMissingAttributes(missingAttributes);
        return this;
    }

    public Config withStats(Map<String, Integer> stats) {
        this.stats = stats;
        return this;
    }
}
