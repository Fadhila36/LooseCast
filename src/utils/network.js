const os = require('os');

/**
 * Mendapatkan IPv4 lokal terbaik untuk koneksi LAN/WiFi (misal untuk QR Phone connect).
 * Memprioritaskan interface fisik/WiFi (192.168.x.x / 10.x.x.x) dan
 * mengabaikan internal loopback, APIPA (169.254.x.x), serta virtual adapters (vEthernet/WSL/Docker).
 */
function getLocalIPv4(customNets = null) {
  const nets = customNets || os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    const isVirtual = /vEthernet|wsl|virtual|docker|vmware|vbox|hyper-v/i.test(name);
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        candidates.push({
          name,
          address: net.address,
          isVirtual,
          isPrivate: /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(net.address)
        });
      }
    }
  }

  // Prioritas 1: Private IP non-virtual (misal Wi-Fi / Ethernet aktif: 192.168.x.x)
  const best = candidates.find(c => !c.isVirtual && c.isPrivate);
  if (best) return best.address;

  // Prioritas 2: Kandidat non-virtual apapun
  const nonVirtual = candidates.find(c => !c.isVirtual);
  if (nonVirtual) return nonVirtual.address;

  // Prioritas 3: Kandidat pertama yang ada
  if (candidates.length > 0) return candidates[0].address;

  return '127.0.0.1';
}

module.exports = { getLocalIPv4 };
