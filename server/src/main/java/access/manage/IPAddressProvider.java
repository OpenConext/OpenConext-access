package access.manage;

import lombok.SneakyThrows;

import java.net.Inet4Address;
import java.net.InetAddress;

public class IPAddressProvider {

    private IPAddressProvider() {
    }

    @SneakyThrows
    public static IPInfo getIpInfo(String ipAddress, Integer networkPrefix) {
        InetAddress address = InetAddress.getByName(ipAddress);
        boolean isIpv4 = address instanceof Inet4Address;
        if (networkPrefix == null) {
            networkPrefix = isIpv4 ? 24 : 64;
        }
        CIDRInstance cidrInstance = new CIDRInstance(ipAddress.concat("/").concat(networkPrefix.toString()));
        int byteSize = isIpv4 ? 32 : 128;
        double capacity = Math.pow(2, byteSize - networkPrefix);
        return new IPInfo(cidrInstance.getNetworkAddress(), cidrInstance.getBroadcastAddress(), capacity, isIpv4, networkPrefix);
    }

}
