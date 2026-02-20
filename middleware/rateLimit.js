// middleware/rateLimit.js — Three-tier rate limiting

import rateLimit from "express-rate-limit";

// ── 1. Global IP limiter — all routes ────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: "Too many requests from this IP. Try again in 15 minutes." },
  skip: (req) => req.path === "/healthz",
});

// ── 2. Write limiter — create/edit/delete posts ───────────────────────────────
//    Logged-in users get 3× more headroom than guests
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => (req.isAuthenticated?.() ? 60 : 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `user_${req.user.id}` : req.ip),
  message: { error: "Too many write requests. Please wait a few minutes." },
});

// ── 3. Auth limiter — login + Google OAuth attempts ───────────────────────────
//    Strict: 10 attempts per IP per hour
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in an hour." },
  handler: (req, res) => {
    // For browser form submissions, redirect instead of JSON
    req.session.authError = "Too many attempts. Please wait an hour before trying again.";
    res.redirect("/auth/login");
  },
});

// ── 4. Register limiter — stricter than login ─────────────────────────────────
//    5 registrations per IP per 24 hours (prevents account farming)
export const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.session.authError = "Too many accounts created from this IP. Try again tomorrow.";
    res.redirect("/auth/register");
  },
});
