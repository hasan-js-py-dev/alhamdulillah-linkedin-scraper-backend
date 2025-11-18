const { ObjectId } = require('mongodb');
const { getDb } = require('./db');
const { PROXY_DB_NAME, PROXIES_COLLECTION, PROXY_ASSIGNMENTS_COLLECTION } = require('../config/config');

async function getProxyForUser(userId) {
  if (!userId) {
    throw new Error('USER_ID_REQUIRED');
  }

  const db = await getDb(PROXY_DB_NAME);
  const proxies = db.collection(PROXIES_COLLECTION);
  const assignments = db.collection(PROXY_ASSIGNMENTS_COLLECTION);
  const now = new Date();

  const existingAssignment = await assignments.findOne({ userId });
  if (existingAssignment) {
    const proxyObjectId = toObjectId(existingAssignment.proxyId);
    if (proxyObjectId) {
      const proxyDoc = await proxies.findOne({ _id: proxyObjectId });
      if (proxyDoc) {
        await assignments.updateOne({ _id: existingAssignment._id }, { $set: { lastUsedAt: now } });
        return normalizeProxyDoc(proxyDoc, existingAssignment);
      }
    }

    await assignments.deleteOne({ _id: existingAssignment._id });
  }

  const assignedProxyDocs = await assignments.find({}, { projection: { proxyId: 1 } }).toArray();
  const assignedProxyIds = assignedProxyDocs
    .map(doc => toObjectId(doc.proxyId))
    .filter(Boolean);

  const availableFilterParts = [
    { $or: [{ status: { $exists: false } }, { status: { $in: ['available', 'idle', 'active'] } }] }
  ];

  if (assignedProxyIds.length) {
    availableFilterParts.push({ _id: { $nin: assignedProxyIds } });
  }

  const availableFilter = availableFilterParts.length > 1 ? { $and: availableFilterParts } : availableFilterParts[0];

  const availableProxy = await proxies.find(availableFilter).sort({ lastTested: 1, _id: 1 }).limit(1).next();

  if (!availableProxy) {
    const error = new Error('NO_PROXY_AVAILABLE');
    error.code = 'NO_PROXY_AVAILABLE';
    throw error;
  }

  await assignments.updateOne(
    { proxyId: availableProxy._id.toString() },
    {
      $set: {
        proxyId: availableProxy._id.toString(),
        userId,
        assignedAt: now,
        lastUsedAt: now,
        status: 'assigned'
      }
    },
    { upsert: true }
  );

  return normalizeProxyDoc(availableProxy, {
    proxyId: availableProxy._id.toString(),
    userId,
    assignedAt: now,
    lastUsedAt: now,
    status: 'assigned'
  });
}

function normalizeProxyDoc(doc, assignment) {
  const proxy = {
    host: resolveProxyHost(doc),
    port: resolveProxyPort(doc),
    username: doc.username || doc.proxyUsername || (doc.auth && doc.auth.username) || undefined,
    password: doc.password || doc.proxyPassword || (doc.auth && doc.auth.password) || undefined
  };

  const fingerprint = doc.fingerprint || {
    userAgent: doc.userAgent,
    viewport: doc.viewport,
    locale: doc.locale,
    timezoneId: doc.timezoneId
  };

  return {
    proxy,
    fingerprint,
    metadata: {
      proxyId: doc._id instanceof ObjectId ? doc._id.toHexString() : doc._id,
      location: doc.location,
      status: assignment ? assignment.status : doc.status,
      userId: assignment ? assignment.userId : doc.assignedTo,
      assignedAt: assignment && assignment.assignedAt,
      lastUsedAt: assignment && assignment.lastUsedAt,
      geolocation: doc.geolocation
    }
  };
}

function resolveProxyHost(doc) {
  return (
    doc.host ||
    doc.hostname ||
    doc.ip ||
    doc.proxy ||
    doc.serverAddress ||
    doc.actualIP ||
    undefined
  );
}

function resolveProxyPort(doc) {
  const raw = doc.port || doc.proxyPort || doc.serverPort || doc.proxy_port;
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw.trim());
    return Number.isNaN(parsed) ? raw.trim() : parsed;
  }
  return undefined;
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
  } catch (err) {
    return null;
  }
}

module.exports = {
  getProxyForUser
};
