package access;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

public class CustomWireMockExtension extends WireMockServer implements BeforeEachCallback, AfterEachCallback {

    public CustomWireMockExtension(int port) {
        super(port);
    }

    @Override
    public void beforeEach(ExtensionContext context) {
        this.start();
        this.resetAll();
        WireMock.configureFor("localhost", port());
    }

    @Override
    public void afterEach(ExtensionContext context) {
        this.stop();
        this.resetAll();
    }

}
