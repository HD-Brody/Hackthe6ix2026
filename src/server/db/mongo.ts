import { MongoClient, Db } from "mongodb";

// Cache across Next.js hot reloads — without this, every file save in dev
// opens a new connection pool until Atlas's M0 connection cap (500) kills you.
const g = globalThis as unknown as { _mongoClient?: MongoClient };

function getClient(): MongoClient {
  if (!g._mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set — check .env.local");
    g._mongoClient = new MongoClient(uri);
  }
  return g._mongoClient;
}

export async function getDb(): Promise<Db> {
  return getClient().db(process.env.MONGODB_DB ?? "professor_me");
}
