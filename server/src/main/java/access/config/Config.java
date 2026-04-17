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
    private String eduIdSchacHomeOrganization;
    private String surfSchacHomeOrganization;
    private String name;
    private String sram;
    private String invite;
    private String serviceDesk;
    private String discovery;
    private boolean authenticated;
    private List<String> missingAttributes;
    private Map<String, Integer> stats;
    private List<Map<String, String>> identityProviders;
    private String idpProxyMetaData;
    private List<Feature> features;
    private List<String> acrValues;
    private String minimalStepupAcrLevel;
    private boolean feedbackWidgetEnabled;

    public Config(Config base) {
        this.clientUrl = base.clientUrl;
        this.baseUrl = base.baseUrl;
        this.discovery = base.discovery;
        this.eduIdSchacHomeOrganization = base.eduIdSchacHomeOrganization;
        this.surfSchacHomeOrganization = base.surfSchacHomeOrganization;
        this.invite = base.invite;
        this.sram = base.sram;
        this.serviceDesk = base.serviceDesk;
        this.identityProviders = base.identityProviders;
        this.idpProxyMetaData = base.idpProxyMetaData;
        this.features = base.features;
        this.acrValues = base.acrValues;
        this.minimalStepupAcrLevel = base.minimalStepupAcrLevel;
        this.feedbackWidgetEnabled = base.feedbackWidgetEnabled;
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
