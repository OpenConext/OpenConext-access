package access;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

public class CustomWireMockExtension extends WireMockServer implements BeforeAllCallback, AfterEachCallback {

    public CustomWireMockExtension(int port) {
        super(port);
    }

    @Override
    public void beforeAll(ExtensionContext context) {
        if (!this.isRunning()) {
            this.start();
            WireMock.configureFor("localhost", port());
        }
    }

    @Override
    public void afterEach(ExtensionContext context) {
        this.resetAll();  // Only reset stubs between tests
    }

}
