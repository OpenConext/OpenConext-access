import {expect, test} from 'vitest'
import {getNetworkInfo} from "../../utils/CidrNotation.js";

test("Test getNetworkInfo IPV4", () => {
    const networkInfo = getNetworkInfo("255.0.0.8", 16);
    expect(networkInfo).toEqual({
        broadcastAddress: "255.0.255.255",
        capacity: 65536,
        ipv4: true,
        networkAddress: "255.0.0.0",
        prefix: 16,
    });
});

test("Test getNetworkInfo IPV6", () => {
    const networkInfo = getNetworkInfo("2001:db8::1", 64);
    expect(networkInfo).toEqual({
        broadcastAddress: "2001:db8::ffff:ffff:ffff:ffff",
        capacity: 18446744073709552000,
        ipv4: false,
        networkAddress: "2001:db8:",
        prefix: 64,
    });
});
