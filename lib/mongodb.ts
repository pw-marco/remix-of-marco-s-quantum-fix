import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Emulate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Define a custom type for your cache object
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // Use the custom cache type, NOT typeof mongoose!
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

// Initialize cache or fallback
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

/** Default database name used when the URI does not contain one. */
export const DEFAULT_DB_NAME = "pw-marco";

/**
 * A connection string like
 *   mongodb+srv://user:pass@cluster0.mongodb.net/?appName=Cluster0
 * has NO database name, so the driver silently uses `test` and every query
 * returns nothing. This reads the db name from the URI when present and
 * otherwise falls back to MONGODB_DB / "pw-marco".
 */
export function getDbNameFromUri(uri: string): string | null {
  try {
    // path part between the host and the query string
    const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    const afterHost = withoutScheme.slice(withoutScheme.indexOf("/") + 1);
    if (!withoutScheme.includes("/")) return null;
    const dbPart = afterHost.split("?")[0];
    return dbPart ? decodeURIComponent(dbPart) : null;
  } catch {
    return null;
  }
}

export function resolveDbName(uri?: string): string {
  const fromUri = uri ? getDbNameFromUri(uri) : null;
  return fromUri || process.env.MONGODB_DB || DEFAULT_DB_NAME;
}

async function dbConnect(): Promise<typeof mongoose> {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUri, {
      dbName: resolveDbName(mongodbUri),
    });
  }

  cached.conn = await cached.promise;
  global.mongoose = cached; // Assign your cache object, not the mongoose module itself
  return cached.conn;
}
export default dbConnect;
