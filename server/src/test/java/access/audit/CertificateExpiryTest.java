package access.audit;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CertificateExpiryTest {

    //Generated with keytool, valid for one day
    private static final String SHORT_LIVED = "MIICzTCCAbWgAwIBAgIIK7V7KbjOdIQwDQYJKoZIhvcNAQEMBQAwFTETMBEGA1UEAxMKYXVkaXQtdGVzdDAeFw0yNjExMDkxNDAxMzdaFw0yNjExMTAxNDAxMzdaMBUxEzARBgNVBAMTCmF1ZGl0LXRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCl5uxQb/TS/ZeV8HlZkI0+Knxp8ZFgngQGAvcl19bGXtEPvB37CbXn6owo+Ttx9Q54fOo53EPTQlMaZBJorlFnDKDtCJE4xNxlTIG3MVjowiN6Gk3/GASl+Nvz/IsveYdCfa9cV2mXC6yb/YObA9RfqLB4z5WVt4bkS0zF84n7a1oErtsFibi5nLahX4puLk0qUCe2b/7VHHSdjaiwfvLdvyg4WIrju1HnP8D1oxeQXjIGuKzZEKe/ZVnMpsbaI/amNwgKT570r3uqTJKSHKOx8vngArgHaybO/1P4/OW+7p0F4dxYcKN9Sfvmcp/itlLZ0QseOccv/8zw+ukx49DnAgMBAAGjITAfMB0GA1UdDgQWBBRQ32qQa4mKoNhOoIhOchBABC1TvDANBgkqhkiG9w0BAQwFAAOCAQEAQbFsdbnOhKQSorsDIiFKfy5SLX99sla/YCgM/OJaMTgwoxBY1V8tsEIU6cyo89/qRPnh4APKsBZlzcXJU8oQyeeZgLLFkVFh/GwLLDdd1O4WIB7ZNfwM1ioxXbiZYnyZWN2NRpEzeuoH3W2XvoMCUacgDwrvBcJ5f9HmMedy/2ILubssXlOvEmOM+pK8q5fx7v2y6k3XJYi9OocipvFoIoxvsuJhL5Ad3gUbrMrFu3I1PZ64+uteidCmiX+BVXUHojjY8JR0+AX3ZrV//E2I3FYyE3zkeBINXyKVX0xco2sQaYyrUc300T85Iyx2coZwzY0mPS4Nb+TCn16xCLQFtg==";
    //Generated with keytool, valid for 100 years
    private static final String LONG_LIVED = "MIIC0DCCAbigAwIBAgIJAKvsTmOiy5HwMA0GCSqGSIb3DQEBDAUAMBUxEzARBgNVBAMTCmF1ZGl0LXRlc3QwIBcNMjYxMTA5MTQwMTM3WhgPMjEyNjEwMTYxNDAxMzdaMBUxEzARBgNVBAMTCmF1ZGl0LXRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCo6cChVYdAErr1ndxqyLV9cFnekg2Hs71fS6JAbMb6LVQS2VwrOZWPYLjLopsPGdBIY/zIgF4HLhPgzIdxvyOR34NYPq7KrYfzFj6EGvSfqCH4+3Q2sfTlCgEmUzveSpGNKF1Mh2MTX5lnd+ItQkw19D7yrvbKrrBqoUVNPYqtKx3s2AWNgaV+kA1KAmSD/uuqj8007lKNzZvL9DsvjVAQfvockE/kgj3CdKVwFlfvhW3DN2Xb0pUvOyT4uNcxXCYWpRFLzF1VR62t3Xxs7b0WLXhdZl4kCvBN+iRQHB/ZOLGkatfT5w7/dlXxPxwr0lhokP4Ojirgw/q/4Dlzfsl7AgMBAAGjITAfMB0GA1UdDgQWBBTaQ/UWnHo9zBdatK955le+8RHUPjANBgkqhkiG9w0BAQwFAAOCAQEAoRSEt3nkTj9wOZpno/M129btCL6acD++1jmkf8vvC84zZ8gjlN9Wk4vspn7ro2td/hmuAKLlggw9DrCSG38G4VnWbcdDUAujtLWXgUh5a90uZcRy+Ml+fXUYa/Nm+sV+QiK06nYunm9lqlb34tx2QzPf7xgoY2JGjAg7GwzLcfNYxwxV7Gv37uFAuqcpx1QZPVeVilpflkK1Yr3vkkwbkiWx9DA3gv4TuOZyciD9yuSTUErxCrgSsUxuHxRc/iozHB2l6DbYFN1BoGf6qdgTYe2hWtLhmkYXngjOC4BO/ECJ7fo6ltboKNDzdm7OmE+QBGFcazTJhFyvI2S47TxNnA==";

    private Map<String, Object> identityProvider(Map<String, Object> metaDataFields) {
        return new HashMap<>(Map.of("data", new HashMap<>(Map.of("metaDataFields", metaDataFields))));
    }

    @Test
    void expiredOrSoonExpiringCertificateIsReported() {
        Instant afterExpiry = Instant.now().plusSeconds(3 * 24 * 3600);
        List<Instant> expiring = CertificateExpiry.expiringSoon(
                identityProvider(Map.of("certData", SHORT_LIVED)), afterExpiry);
        assertEquals(1, expiring.size());
    }

    @Test
    void longLivedCertificateIsNotReported() {
        assertTrue(CertificateExpiry.expiringSoon(
                identityProvider(Map.of("certData", LONG_LIVED)), Instant.now()).isEmpty());
    }

    @Test
    void multipleCertificatesAndGarbageAreHandled() {
        List<Instant> expiring = CertificateExpiry.expiringSoon(
                identityProvider(Map.of("certData", SHORT_LIVED, "certData2", LONG_LIVED, "certData3", "not a certificate")),
                Instant.now().plusSeconds(3 * 24 * 3600));
        assertEquals(1, expiring.size());
    }

    @Test
    void noCertificatesNoAttention() {
        assertTrue(CertificateExpiry.expiringSoon(identityProvider(Map.of()), Instant.now()).isEmpty());
    }

}
