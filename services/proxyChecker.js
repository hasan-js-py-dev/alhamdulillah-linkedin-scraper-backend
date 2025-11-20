const net = require('net');
const { PROXY_CHECK_TIMEOUT_MS } = require('../config/config');

function checkProxyLiveness(proxy, timeoutMs = PROXY_CHECK_TIMEOUT_MS) {
  if (!proxy || !proxy.host || !proxy.port) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: proxy.host, port: proxy.port });
    let settled = false;

    const finalize = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs, () => finalize(false));
    socket.once('connect', () => finalize(true));
    socket.once('error', () => finalize(false));
  });
}

module.exports = {
  checkProxyLiveness
};
