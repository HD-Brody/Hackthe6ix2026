/**
 * MongoDB Atlas connection. Owner: A (connection string from D at CP0).
 *
 * Collections (design doc §4): users, sessions, conceptGraphs, utterances.
 * Persist per turn so a refresh doesn't kill a demo.
 */

// TODO(A): singleton MongoClient (cache across hot reloads — the standard
// global-in-dev pattern), export getDb().

export async function getDb(): Promise<never> {
  throw new Error("not implemented");
}
