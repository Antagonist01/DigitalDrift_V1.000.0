// routes/auth.js — All authentication routes
//   GET  /auth/login        → login page
//   POST /auth/login        → local login
//   GET  /auth/register     → register page
//   POST /auth/register     → create local account
//   GET  /auth/google       → start OAuth
//   GET  /auth/google/callback
//   GET  /auth/logout

import express              from "express";
import passport             from "passport";
import validator            from "validator";
import { authLimiter, registerLimiter }      from "../middleware/rateLimit.js";
import { hashPassword }     from "./passport.js";
import { getDB }            from "../db/index.js";

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
function redirectIfLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return res.redirect("/");
  next();
}

// ── GET /auth/login ───────────────────────────────────────────────────────────
router.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login", {
    user:  null,
    error: req.session.authError || null,
    info:  req.session.authInfo  || null,
  });
  delete req.session.authError;
  delete req.session.authInfo;
});

// ── POST /auth/login (local strategy) ────────────────────────────────────────
router.post("/login", authLimiter, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err)   return next(err);
    if (!user) {
      req.session.authError = info?.message || "Login failed.";
      return res.redirect("/auth/login");
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      const returnTo = req.session.returnTo || "/";
      delete req.session.returnTo;
      res.redirect(returnTo);
    });
  })(req, res, next);
});

// ── GET /auth/register ────────────────────────────────────────────────────────
router.get("/register", redirectIfLoggedIn, (req, res) => {
  res.render("register", {
    user:  null,
    error: req.session.authError || null,
  });
  delete req.session.authError;
});

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post("/register", registerLimiter, async (req, res, next) => {
  const { display_name, email, password, confirm_password } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors = [];

  if (!display_name || display_name.trim().length < 2)
    errors.push("Display name must be at least 2 characters.");

  if (!email || !validator.isEmail(email))
    errors.push("Please enter a valid email address.");

  if (!password || password.length < 8)
    errors.push("Password must be at least 8 characters.");

  if (password !== confirm_password)
    errors.push("Passwords do not match.");

  // Password strength: must have uppercase, lowercase, digit, special char
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (password && !strongPassword.test(password))
    errors.push("Password must include uppercase, lowercase, a number, and a special character (!@#$% etc.).");

  if (errors.length) {
    req.session.authError = errors.join(" ");
    return res.redirect("/auth/register");
  }

  try {
    const sql          = getDB();
    const cleanEmail   = email.toLowerCase().trim();
    const cleanName    = display_name.trim();

    // Check if email already exists
    const [existing] = await sql`SELECT id, google_id FROM users WHERE email = ${cleanEmail}`;
    if (existing) {
      req.session.authError = existing.google_id
        ? "That email is linked to a Google account. Please use 'Continue with Google'."
        : "An account with that email already exists. Please log in.";
      return res.redirect("/auth/register");
    }

    // Hash password — bcrypt with 14 rounds + auto-generated random salt
    // The resulting hash is 60 chars, format: $2b$14$<salt><hash>
    // This is irreversible — not even the DB admin can recover the plaintext
    const password_hash = await hashPassword(password);

    // Insert new user
    const [user] = await sql`
      INSERT INTO users (email, display_name, password_hash, email_verified)
      VALUES (${cleanEmail}, ${cleanName}, ${password_hash}, FALSE)
      RETURNING id, email, display_name, avatar_url, google_id, user_uid, email_verified
    `;

    // Log them in immediately after registration
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });

  } catch (err) {
    console.error("Register error:", err.message);
    req.session.authError = "Registration failed. Please try again.";
    res.redirect("/auth/register");
  }
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/google",
  authLimiter,
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  authLimiter,
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  (req, res) => {
    const returnTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

// ── Logout ────────────────────────────────────────────────────────────────────
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

export default router;
