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

// Suppress known Neon driver error: "Cannot set property message of #<ErrorEvent>"
// This is a non-fatal bug in @neondatabase/serverless v0.10.4 when handling WebSocket errors
// The connection still works, but the error crashes Node.js due to the driver's internal bug
// NOTE: This is a SYNCHRONOUS TypeError, so we need to catch it with uncaughtException

process.on('uncaughtException', (error: Error) => {
  // Only suppress the specific ErrorEvent property assignment error from Neon driver
  if (
    error?.message === 'Cannot set property message of #<ErrorEvent> which has only a getter' ||
    (error?.message?.includes('Cannot set property message') && 
     error?.message?.includes('which has only a getter') &&
     error?.stack?.includes('@neondatabase/serverless') &&
     error?.stack?.includes('_connectionCallback'))
  ) {
    // Known non-fatal bug in Neon driver v0.10.4 - connection still works, silently suppress
    // This prevents the server from crashing on this harmless error
    return;
  }
  
  // For all other uncaught exceptions, log and exit (normal behavior)
  console.error('Uncaught exception (fatal):', error);
  process.exit(1);
});

// Connection pool with error handling and auto-retry
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Wait 10s for new connections
});

// Handle pool errors gracefully (don't crash the server)
pool.on('error', (err) => {
  // Ignore the specific ErrorEvent property assignment error
  if (err?.message?.includes('Cannot set property message of #<ErrorEvent>')) {
    return; // Silently ignore this known bug
  }
  console.error('⚠️  Unexpected database error (non-fatal):', err.message);
  console.log('🔄 Connection will auto-retry on next request');
});

// Handle connection errors
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

export const db = drizzle(pool, { schema });
