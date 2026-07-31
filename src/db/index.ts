import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

export function getDatabase() {
  const connectionString =
    process.env.NEON_POSTGRES_CONNECTION_STRING ?? process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  return drizzle(neon(connectionString), { schema });
}
