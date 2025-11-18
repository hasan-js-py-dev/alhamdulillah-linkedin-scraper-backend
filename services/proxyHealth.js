const net = require('net');
const { ObjectId } = require('mongodb');
const { getProxyForUser } = require('./proxyAssigner');
const { getDb } = require('./db');
const { PROXY_DB_NAME, PROXY_ASSIGNMENTS_COLLECTION, PROXIES_COLLECTION } = require('../config/config');

const MAX_HEALTH_ATTEMPTS = Number(process.env.PROXY_HEALTH_MAX_ATTEMPTS || 3);
const HEALTH_CHECK_TIMEOUT_MS = Number(process.env.PROXY_HEALTH_TIMEOUT_MS || 5000);

async function ensureHealthyProxyForUser(userId) {
  let lastError;

  for (let attempt = 0; attempt < MAX_HEALTH_ATTEMPTS; attempt += 1) {
    const assignment = await getProxyForUser(userId);
    if (!assignment || !assignment.proxy) {
      const error = new Error('NO_PROXY_AVAILABLE');
      error.code = 'NO_PROXY_AVAILABLE';
      throw error;
    }

    const isHealthy = await isProxyReachable(assignment.proxy, HEALTH_CHECK_TIMEOUT_MS);
    if (isHealthy) {
      await markProxyHealth(assignment.metadata.proxyId, true);
      return assignment;
    }

    lastError = new Error('NO_HEALTHY_PROXY_AVAILABLE');
    lastError.code = 'NO_HEALTHY_PROXY_AVAILABLE';
    await markProxyHealth(assignment.metadata.proxyId, false);
    await clearAssignment(userId);
  }

  const error = lastError || new Error('NO_HEALTHY_PROXY_AVAILABLE');
  error.code = error.code || 'NO_HEALTHY_PROXY_AVAILABLE';
  throw error;
}

function isProxyReachable(proxy, timeoutMs) {
  if (!proxy || !proxy.host || !proxy.port) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: proxy.host, port: proxy.port });
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function clearAssignment(userId) {
  const db = await getDb(PROXY_DB_NAME);
  const assignments = db.collection(PROXY_ASSIGNMENTS_COLLECTION);
  await assignments.deleteOne({ userId });
}

async function markProxyHealth(proxyId, healthy) {
  const db = await getDb(PROXY_DB_NAME);
  const proxies = db.collection(PROXIES_COLLECTION);
  const objectId = toObjectId(proxyId);
  if (!objectId) {
    return;
  }

  const update = {
    $set: {
      lastHealthCheck: new Date()
    }
  };

  if (healthy) {
    update.$set.status = 'active';
  } else {
    update.$set.status = 'unhealthy';
  }

  await proxies.updateOne({ _id: objectId }, update);
}

function toObjectId(value) {
  if (!value) {
    return null;
  }

  if (value instanceof ObjectId) {
    return value;
  }

  try {
    return new ObjectId(value);
  } catch (error) {
    return null;
  }
}

module.exports = {
  ensureHealthyProxyForUser,
  isProxyReachable
};
