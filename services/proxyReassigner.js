const { ObjectId } = require('mongodb');
const { getDb } = require('./db');
const { getProxyForUser } = require('./proxyAssigner');
const {
  PROXY_DB_NAME,
  PROXY_ASSIGNMENTS_COLLECTION,
  PROXIES_COLLECTION
} = require('../config/config');

async function reassignProxyForUser({ userId, proxyId, reason = 'UNSPECIFIED' }) {
  if (!userId) {
    throw new Error('USER_ID_REQUIRED');
  }

  await Promise.all([
    markProxyAsUnhealthy(proxyId, reason),
    clearAssignment(userId)
  ]);

  return getProxyForUser(userId);
}

async function markProxyAsUnhealthy(proxyId, reason) {
  if (!proxyId) {
    return;
  }

  const objectId = toObjectId(proxyId);
  if (!objectId) {
    return;
  }

  const db = await getDb(PROXY_DB_NAME);
  const proxies = db.collection(PROXIES_COLLECTION);

  await proxies.updateOne(
    { _id: objectId },
    {
      $set: {
        status: 'unhealthy',
        lastHealthCheck: new Date(),
        lastFailureReason: reason
      }
    }
  );
}

async function clearAssignment(userId) {
  if (!userId) {
    return;
  }

  const db = await getDb(PROXY_DB_NAME);
  const assignments = db.collection(PROXY_ASSIGNMENTS_COLLECTION);
  await assignments.deleteOne({ userId });
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
  reassignProxyForUser
};
