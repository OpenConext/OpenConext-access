package access.manage;

import java.math.BigInteger;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

/**
 * A class that enables to get an IP range from CIDR specification. It supports
 * both IPv4 and IPv6.
 */
public class CIDRInstance {

    private final InetAddress inetAddress;
    private InetAddress startAddress;
    private InetAddress endAddress;
    private final int prefixLength;

    public CIDRInstance(String cidr) throws UnknownHostException {
        // split CIDR to address and prefix part
        int index = cidr.indexOf("/");
        String addressPart = cidr.substring(0, index);
        String networkPart = cidr.substring(index + 1);

        inetAddress = InetAddress.getByName(addressPart);
        prefixLength = Integer.parseInt(networkPart);

        calculate();
    }


    private void calculate() throws UnknownHostException {
        ByteBuffer maskBuffer;
        int targetSize;
        if (inetAddress.getAddress().length == 4) {
            maskBuffer =
                    ByteBuffer
                            .allocate(4)
                            .putInt(-1);
            targetSize = 4;
        } else {
            maskBuffer = ByteBuffer.allocate(16)
                    .putLong(-1L)
                    .putLong(-1L);
            targetSize = 16;
        }

        BigInteger mask = (new BigInteger(1, maskBuffer.array())).not().shiftRight(prefixLength);

        ByteBuffer buffer = ByteBuffer.wrap(inetAddress.getAddress());
        BigInteger ipVal = new BigInteger(1, buffer.array());

        BigInteger startIp = ipVal.and(mask);
        BigInteger endIp = startIp.add(mask.not());

        byte[] startIpArr = toBytes(startIp.toByteArray(), targetSize);
        byte[] endIpArr = toBytes(endIp.toByteArray(), targetSize);

        this.startAddress = InetAddress.getByAddress(startIpArr);
        this.endAddress = InetAddress.getByAddress(endIpArr);

    }

    private byte[] toBytes(byte[] array, int targetSize) {
        int counter = 0;
        List<Byte> newArr = new ArrayList<Byte>();
        while (counter < targetSize && (array.length - 1 - counter >= 0)) {
            newArr.add(0, array[array.length - 1 - counter]);
            counter++;
        }

        int size = newArr.size();
        for (int i = 0; i < (targetSize - size); i++) {

            newArr.add(0, (byte) 0);
        }

        byte[] ret = new byte[newArr.size()];
        for (int i = 0; i < newArr.size(); i++) {
            ret[i] = newArr.get(i);
        }
        return ret;
    }

    public String getNetworkAddress() {
        return this.startAddress.getHostAddress();
    }

    public String getBroadcastAddress() {
        return this.endAddress.getHostAddress();
    }

}