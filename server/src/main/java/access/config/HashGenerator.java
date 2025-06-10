package access.config;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.RandomStringUtils;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Random;

public class HashGenerator {

    private static final Random secureRandom = new SecureRandom();

    private HashGenerator() {
    }

    public static String generateRandomHash() {
        byte[] aesKey = new byte[128];
        secureRandom.nextBytes(aesKey);
        //Avoid decoding / encoding as URL parameter problems
        return Base64.getUrlEncoder().withoutPadding().encodeToString(aesKey);
    }

}
