package access.manage;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CidrNotationTest {

    @Test
    void getIpInfoIPv4() {
        CidrNotation cidrNotation = new CidrNotation("192.168.1.1", 16);
        IPInfo ipInfo = cidrNotation.getIpInfo();
        assertEquals("192.168.255.255", ipInfo.getBroadcastAddress());
        assertEquals("192.168.0.0", ipInfo.getNetworkAddress());
        assertEquals(65536.0, ipInfo.getCapacity());
        assertEquals(16, ipInfo.getPrefix());
        assertTrue(ipInfo.isIpv4());
    }

    @Test
    void getIpInfoIPv6() {
        CidrNotation cidrNotation = new CidrNotation("2001:db8:3333:4444:5555:6666:7777:8888", 64);
        IPInfo ipInfo = cidrNotation.getIpInfo();
        assertEquals("2001:db8:3333:4444:ffff:ffff:ffff:ffff", ipInfo.getBroadcastAddress());
        assertEquals("2001:db8:3333:4444:0:0:0:0", ipInfo.getNetworkAddress());
        assertEquals(1.8446744073709552E19, ipInfo.getCapacity());
        assertEquals(64, ipInfo.getPrefix());
        assertFalse(ipInfo.isIpv4());
    }
}