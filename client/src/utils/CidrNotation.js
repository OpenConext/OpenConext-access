const isValidIPv4 = (ip) => {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
        if (!/^\d{1,3}$/.test(part)) return false;
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255 && String(num) === part;
    });
};

const isValidIPv6 = (ip) => {
    if (ip === '::') return true;
    const doubleColonCount = (ip.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;
    const segments = ip.split(':');
    if (doubleColonCount === 1) {
        const emptyIndex = ip.indexOf('::');
        const before = ip.slice(0, emptyIndex).split(':').filter(s => s !== '');
        const after = ip.slice(emptyIndex + 2).split(':').filter(s => s !== '');
        if (before.length + after.length > 7) return false;
        return [...before, ...after].every(s => /^[0-9a-fA-F]{1,4}$/.test(s));
    }
    if (segments.length !== 8) return false;
    return segments.every(s => /^[0-9a-fA-F]{1,4}$/.test(s));
};

const ipToInt = (ip) => {
    return ip.split('.').reduce((int, octet) => {
        return (int << 8) + parseInt(octet, 10);
    }, 0) >>> 0;
};

const intToIp = (int) => {
    return [
        (int >>> 24) & 0xFF,
        (int >>> 16) & 0xFF,
        (int >>> 8) & 0xFF,
        int & 0xFF
    ].join('.');
};

const ipv6ToSegments = (ip) => {
    // Expand :: shorthand
    let segments = ip.split(':');
    const emptyIndex = segments.indexOf('');

    if (emptyIndex !== -1) {
        const before = segments.slice(0, emptyIndex).filter(s => s !== '');
        const after = segments.slice(emptyIndex + 1).filter(s => s !== '');
        const missing = 8 - before.length - after.length;
        segments = [...before, ...Array(missing).fill('0'), ...after];
    }

    return segments.map(s => parseInt(s || '0', 16));
};

const segmentsToIpv6 = (segments) => {
    // Convert to hex strings
    let hexSegments = segments.map(s => s.toString(16));

    // Find longest sequence of zeros for compression
    let maxZeroStart = -1;
    let maxZeroLen = 0;
    let currentZeroStart = -1;
    let currentZeroLen = 0;

    for (let i = 0; i < hexSegments.length; i++) {
        if (hexSegments[i] === '0') {
            if (currentZeroStart === -1) {
                currentZeroStart = i;
                currentZeroLen = 1;
            } else {
                currentZeroLen++;
            }
        } else {
            if (currentZeroLen > maxZeroLen) {
                maxZeroStart = currentZeroStart;
                maxZeroLen = currentZeroLen;
            }
            currentZeroStart = -1;
            currentZeroLen = 0;
        }
    }

    if (currentZeroLen > maxZeroLen) {
        maxZeroStart = currentZeroStart;
        maxZeroLen = currentZeroLen;
    }

    // Compress if we found a sequence
    if (maxZeroLen > 1) {
        const before = hexSegments.slice(0, maxZeroStart);
        const after = hexSegments.slice(maxZeroStart + maxZeroLen);
        return [...before, '', ...after].join(':').replace(/:{2,}/, '::');
    }

    return hexSegments.join(':');
};

export const getNetworkInfo = (ipAddress, networkPrefix) => {
    // Detect IP version
    const isIPv6 = ipAddress.includes(':');

    if (isIPv6 && !isValidIPv6(ipAddress)) {
        throw new Error(`Invalid IPv6 address: ${ipAddress}`);
    }
    if (!isIPv6 && !isValidIPv4(ipAddress)) {
        throw new Error(`Invalid IPv4 address: ${ipAddress}`);
    }

    if (isIPv6) {
        // IPv6 processing
        const segments = ipv6ToSegments(ipAddress);
        const prefixBits = networkPrefix;

        // Create mask and apply it
        const networkSegments = segments.map((segment, index) => {
            const bitPosition = index * 16;
            const bitsInSegment = Math.max(0, Math.min(16, prefixBits - bitPosition));

            if (bitsInSegment === 0) return 0;
            if (bitsInSegment === 16) return segment;

            const mask = (~0 << (16 - bitsInSegment)) & 0xFFFF;
            return segment & mask;
        });

        // Calculate broadcast (all host bits set to 1)
        const broadcastSegments = segments.map((segment, index) => {
            const bitPosition = index * 16;
            const bitsInSegment = Math.max(0, Math.min(16, prefixBits - bitPosition));

            if (bitsInSegment === 0) return 0xFFFF;
            if (bitsInSegment === 16) return segment;

            const mask = (~0 << (16 - bitsInSegment)) & 0xFFFF;
            const hostMask = ~mask & 0xFFFF;
            return (segment & mask) | hostMask;
        });

        const networkAddress = segmentsToIpv6(networkSegments);
        const broadcastAddress = segmentsToIpv6(broadcastSegments);
        const capacity = Math.pow(2, 128 - prefixBits);

        return {
            networkAddress: networkAddress,
            broadcastAddress: broadcastAddress,
            capacity: capacity,
            ipv4: false,
            prefix: prefixBits
        };
    } else {
        // IPv4 processing
        const mask = (~0 << (32 - networkPrefix)) >>> 0;
        const ipInt = ipToInt(ipAddress);
        const networkInt = (ipInt & mask) >>> 0;
        const networkAddress = intToIp(networkInt);
        const broadcastInt = (networkInt | ~mask) >>> 0;
        const broadcastAddress = intToIp(broadcastInt);
        const capacity = Math.pow(2, 32 - networkPrefix);

        return {
            networkAddress: networkAddress,
            broadcastAddress: broadcastAddress,
            capacity: capacity,
            ipv4: true,
            prefix: networkPrefix
        };
    }
}
