package access.audit;

import access.manage.ManageData;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * The signing certificates of an IdP that expire soon, derived from the IdP metadata when asked for. This is a state
 * and not an event, so it is not stored.
 */
public final class CertificateExpiry {

    public static final Duration WARNING_PERIOD = Duration.ofDays(30);

    private static final List<String> CERT_FIELDS = List.of("certData", "certData2", "certData3");

    private CertificateExpiry() {
    }

    public static List<Instant> expiringSoon(Map<String, Object> identityProvider, Instant now) {
        List<Instant> expiring = new ArrayList<>();
        Map<String, Object> metaDataFields = ManageData.getMetaDataFields(ManageData.getData(identityProvider));
        for (String field : CERT_FIELDS) {
            Object certData = metaDataFields.get(field);
            if (!(certData instanceof String encoded) || encoded.isBlank()) {
                continue;
            }
            try {
                byte[] der = Base64.getMimeDecoder().decode(encoded
                        .replace("-----BEGIN CERTIFICATE-----", "")
                        .replace("-----END CERTIFICATE-----", ""));
                X509Certificate certificate = (X509Certificate) CertificateFactory.getInstance("X.509")
                        .generateCertificate(new ByteArrayInputStream(der));
                Instant notAfter = certificate.getNotAfter().toInstant();
                if (notAfter.isBefore(now.plus(WARNING_PERIOD))) {
                    expiring.add(notAfter);
                }
            } catch (Exception e) {
                //An unparsable certificate is not our concern here
            }
        }
        return expiring;
    }

}
