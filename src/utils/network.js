/**
 * Network Utilities
 * Resolves local IP address interfaces for mobile companion / QR connectivity.
 * @module utils/network
 */

const os = require('os');

/**
 * Resolves the optimal local IPv4 address for LAN/Wi-Fi connection.
 * Prioritizes physical/Wi-Fi private network interfaces (192.168.x.x / 10.x.x.x / 172.16-31.x.x)
 * while filtering out loopback, APIPA (169.254.x.x), and virtual network adapters.
 * 
 * @param {Record<string, os.NetworkInterfaceInfo[]>} [customNets] - Optional custom network interfaces for unit testing
 * @returns {string} Best matching IPv4 address or '127.0.0.1' fallback
 */
function getLocalIPv4(customNets = null) {
  const nets = customNets || os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    const isVirtual = /vEthernet|wsl|virtual|docker|vmware|vbox|hyper-v/i.test(name);
    const interfaces = nets[name];
    if (!Array.isArray(interfaces)) continue;

    for (const net of interfaces) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        candidates.push({
          name,
          address: net.address,
          isVirtual,
          isPrivate: /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(net.address),
        });
      }
    }
  }

  // Priority 1: Non-virtual private LAN IP (e.g. Wi-Fi / Ethernet: 192.168.x.x)
  const bestPrivate = candidates.find((c) => !c.isVirtual && c.isPrivate);
  if (bestPrivate) return bestPrivate.address;

  // Priority 2: Any non-virtual candidate
  const nonVirtual = candidates.find((c) => !c.isVirtual);
  if (nonVirtual) return nonVirtual.address;

  // Priority 3: First available candidate
  if (candidates.length > 0) return candidates[0].address;

  return '127.0.0.1';
}

module.exports = { getLocalIPv4 };
