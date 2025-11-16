import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Admin database connection for transaction verification and mod wallet data
const ADMIN_DB_URL = 'postgresql://neondb_owner:npg_7ixCtyl9IFJG@ep-odd-tooth-ahlr16bm-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
export const adminPool = new Pool({ connectionString: ADMIN_DB_URL });
export const adminDb = drizzle({ client: adminPool, schema });