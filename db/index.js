// db/index.js — Two clients:
//  1. `getDB()`  → Neon HTTP driver  (for normal queries — works on Vercel)
//  2. `getPgPool()` → node-postgres Pool (for connect-pg-simple sessions only)

import { neon } from "@neondatabase/serverless";
import pg from "pg";

export function getDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set!");
  }
  return neon(process.env.DATABASE_URL);
}

// Singleton pool used only by express-session store
let _pool;
export function getPgPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set!");
  }
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,                  // keep pool tiny for serverless
      idleTimeoutMillis: 10000,
    });
  }
  return _pool;
}
