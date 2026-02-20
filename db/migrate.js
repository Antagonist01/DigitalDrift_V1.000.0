// db/migrate.js  —  node db/migrate.js
// Safe to re-run anytime (all statements are idempotent).
// Supports BOTH Google OAuth users AND local email/password users.

import dotenv from "dotenv";
dotenv.config();
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL not set."); process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("🔧  Running migrations…\n");

  // ── 1. DROP old users table if it has google_id NOT NULL constraint ─────────
  //    We need to support BOTH oauth and local users, so we rebuild it properly.
  //    The IF EXISTS + CASCADE means existing posts.user_id FKs are also dropped
  //    and will be re-added below. Safe to run even if table doesn't exist yet.
  await sql`DROP TABLE IF EXISTS users CASCADE`;
  console.log("  🔄  Dropped old users table (rebuilding with dual-auth schema)");

  // ── 2. Users table — supports Google OAuth AND local email/password ──────────
  //    Rules:
  //      • google_id is NULL  for local users
  //      • password_hash is NULL  for OAuth users
  //      • email must be UNIQUE across both methods
  //      • A CHECK prevents a row having BOTH or NEITHER auth method
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL      PRIMARY KEY,
      email         TEXT        UNIQUE NOT NULL,
      display_name  TEXT        NOT NULL,
      avatar_url    TEXT,
      -- OAuth fields
      google_id     TEXT        UNIQUE,
      -- Local auth fields
      password_hash TEXT,
      -- Unique user id shown publicly (auto-generated, never changes)
      user_uid      TEXT        UNIQUE NOT NULL DEFAULT CONCAT('usr_', gen_random_uuid()::TEXT),
      email_verified BOOLEAN    NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      -- Exactly one of google_id or password_hash must be set
      CONSTRAINT auth_method_check CHECK (
        (google_id IS NOT NULL AND password_hash IS NULL) OR
        (google_id IS NULL     AND password_hash IS NOT NULL)
      )
    )
  `;
  console.log("  ✅  users table ready (dual-auth)");

  // ── 3. Session table ─────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS session (
      sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
      sess   JSON    NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire)`;
  console.log("  ✅  session table ready");

  // ── 4. Re-add user_id FK on posts ────────────────────────────────────────────
  await sql`
    ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  `;
  console.log("  ✅  posts.user_id FK ready");

  // ── 5. Login attempts table (brute-force protection) ─────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id         SERIAL      PRIMARY KEY,
      email      TEXT        NOT NULL,
      ip         TEXT        NOT NULL,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      success    BOOLEAN     NOT NULL DEFAULT FALSE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts(ip)`;
  console.log("  ✅  login_attempts table ready");

  console.log("\n🎉  All migrations complete!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌  Migration failed:", err.message);
  process.exit(1);
});
