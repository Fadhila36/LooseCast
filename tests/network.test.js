const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getLocalIPv4 } = require('../src/utils/network');

describe('Network IP Utility', () => {
  it('harus memprioritaskan IP private non-virtual (WiFi/LAN)', () => {
    const mockNets = {
      'vEthernet (WSL)': [
        { family: 'IPv4', internal: false, address: '172.24.128.1' }
      ],
      'Ethernet (Disconnected)': [
        { family: 'IPv4', internal: false, address: '169.254.252.58' }
      ],
      'Wi-Fi': [
        { family: 'IPv4', internal: false, address: '192.168.1.14' }
      ],
      'Loopback': [
        { family: 'IPv4', internal: true, address: '127.0.0.1' }
      ]
    };

    const ip = getLocalIPv4(mockNets);
    assert.strictEqual(ip, '192.168.1.14');
  });

  it('harus mengembalikan 127.0.0.1 jika hanya ada loopback', () => {
    const mockNets = {
      'Loopback': [
        { family: 'IPv4', internal: true, address: '127.0.0.1' }
      ]
    };

    const ip = getLocalIPv4(mockNets);
    assert.strictEqual(ip, '127.0.0.1');
  });
});
