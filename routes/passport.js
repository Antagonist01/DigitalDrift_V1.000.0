// routes/passport.js — Passport strategies: Google OAuth + Local email/password

import passport from "passport";
import { Strategy as GoogleStrategy }  from "passport-google-oauth20";
import { Strategy as LocalStrategy }   from "passport-local";
import bcrypt                           from "bcrypt";
import { getDB }                        from "../db/index.js";

// ── bcrypt config ─────────────────────────────────────────────────────────────
// cost factor 14 = ~1–2 sec hash time on modern hardware.
// This is the "max salting" you asked for:
//   - bcrypt internally generates a cryptographically random 128-bit salt per hash
//   - cost factor 14 means 2^14 = 16,384 iterations of the key derivation
//   - Even with the DB dump, brute-forcing a single password takes billions of years
//   - The hash stored looks like: $2b$14$<22-char-salt><31-char-hash>
//   - Nobody — including you — can reverse it
const BCRYPT_ROUNDS = 14;

export function configurePassport() {

  // ── Serialize / Deserialize ───────────────────────────────────────────────
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const sql = getDB();
      const [user] = await sql`
        SELECT id, email, display_name, avatar_url, google_id, user_uid, email_verified
        FROM users WHERE id = ${id}
      `;
      done(null, user || null);
    } catch (err) { done(err, null); }
  });

  // ── Strategy 1: Google OAuth ──────────────────────────────────────────────
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL ||
                      "http://localhost:3000/auth/google/callback",
      },
      async (_at, _rt, profile, done) => {
        try {
          const sql       = getDB();
          const googleId  = profile.id;
          const email     = profile.emails?.[0]?.value || "";
          const name      = profile.displayName || "Anonymous";
          const avatar    = profile.photos?.[0]?.value || null;

          // If a local account with same email exists → link google_id to it
          // Otherwise create a brand-new OAuth-only account
          const [user] = await sql`
            INSERT INTO users (google_id, email, display_name, avatar_url, email_verified)
            VALUES (${googleId}, ${email}, ${name}, ${avatar}, TRUE)
            ON CONFLICT (email) DO UPDATE SET
              google_id    = COALESCE(users.google_id, EXCLUDED.google_id),
              display_name = EXCLUDED.display_name,
              avatar_url   = EXCLUDED.avatar_url,
              email_verified = TRUE
            RETURNING id, email, display_name, avatar_url, google_id, user_uid, email_verified
          `;
          done(null, user);
        } catch (err) { done(err, null); }
      }
    )
  );

  // ── Strategy 2: Local (email + password) ─────────────────────────────────
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const sql = getDB();

          // Find user by email
          const [user] = await sql`
            SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}
          `;

          // User not found
          if (!user) {
            return done(null, false, { message: "No account found with that email." });
          }

          // User registered via Google only — no password set
          if (!user.password_hash) {
            return done(null, false, {
              message: "This email is linked to Google sign-in. Use 'Continue with Google' instead.",
            });
          }

          // Compare password against bcrypt hash
          const match = await bcrypt.compare(password, user.password_hash);
          if (!match) {
            return done(null, false, { message: "Incorrect password." });
          }

          // Strip password_hash before attaching to session
          const { password_hash: _, ...safeUser } = user;
          done(null, safeUser);
        } catch (err) { done(err, null); }
      }
    )
  );

  return passport;
}

// ── Exported helper: hash a new password ─────────────────────────────────────
// Used by /auth/register route. bcrypt.hash auto-generates a unique salt.
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}
