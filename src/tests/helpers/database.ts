import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | null = null;

/**
 * Start MongoMemoryServer and connect Mongoose to the memory instance.
 */
export async function startTestDatabase(): Promise<string> {
  const externalUri = process.env.TEST_MONGODB_URI;
  if (externalUri) {
    process.env.MONGODB_URI = externalUri;
    await mongoose.connect(externalUri);
    return externalUri;
  }
  if (mongoose.connection.readyState !== 0 && process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  // Bind only to loopback so the test database is never externally exposed.
  mongoServer = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1" },
  });
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
  return uri;
}

/**
 * Clear all data from all Mongoose collections.
 */
export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key of Object.keys(collections)) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
}

/**
 * Disconnect Mongoose and stop MongoMemoryServer.
 */
export async function stopTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  if (!process.env.TEST_MONGODB_URI) delete process.env.MONGODB_URI;
}
