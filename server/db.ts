import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// This keeps the connection alive on Replit
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connection pool with error handling and auto-retry
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Wait 10s for new connections
});

// Handle pool errors gracefully (don't crash the server)
pool.on('error', (err) => {
  console.error('⚠️  Unexpected database error (non-fatal):', err.message);
  console.log('🔄 Connection will auto-retry on next request');
});

// Handle connection errors
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

export const db = drizzle(pool, { schema });
