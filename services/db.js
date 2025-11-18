const { MongoClient } = require('mongodb');
const { MONGODB_URI } = require('../config/config');

let cachedClient;

async function getMongoClient() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    return cachedClient;
  }

  cachedClient = new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000
  });

  await cachedClient.connect();
  return cachedClient;
}

async function getDb(dbName) {
  const client = await getMongoClient();
  return client.db(dbName);
}

async function closeMongoClient() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
  }
}

module.exports = {
  getMongoClient,
  getDb,
  closeMongoClient
};
