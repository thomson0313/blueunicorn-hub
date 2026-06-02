import mongoose from "mongoose";
import { ensureAdminSeed } from "./seed";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };
if (!global.__mongooseCache) global.__mongooseCache = cached;

export async function connectDB(): Promise<void> {
  if (cached.conn) return;

  // Read at call time: server.ts loads .env via loadEnvConfig after ESM imports are
  // evaluated, so capturing process.env at module load would always be undefined.
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error(
      "MONGODB_URI is not set. Add a MongoDB connection string to your environment (e.g. MongoDB Atlas)."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUri);
  }
  cached.conn = await cached.promise;
  await ensureAdminSeed();
}
