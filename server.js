// server.js — Phase 2: Google OAuth + Sessions + Rate Limiting

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { getPgPool } from "./db/index.js";
import { configurePassport } from "./routes/passport.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Trust Vercel's proxy (needed for req.ip and secure cookies) ───────────────
app.set("trust proxy", 1);

// ── View engine ───────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Static files ──────────────────────────────────────────────────────────────
app.use("/styles", express.static(path.join(__dirname, "public/styles")));
app.use(express.static(path.join(__dirname, "public")));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ── Session store (Neon PostgreSQL via node-postgres) ─────────────────────────
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool: getPgPool(),
      tableName: "session",
      createTableIfMissing: true,   // auto-creates if migrate hasn't run
    }),
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// ── Passport ──────────────────────────────────────────────────────────────────
const passport = configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ── Global rate limiter (all routes) ─────────────────────────────────────────
app.use(globalLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);   // POST /posts, GET /posts/delete/:id, etc.
app.use("/", postRoutes);        // GET / and GET /new, GET /edit/:id

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("error", {
    message: "Page not found.",
    user: req.user || null,
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).render("error", {
    message: "Something went wrong. Please try again.",
    user: req.user || null,
  });
});

// ── Start locally ─────────────────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
  app.listen(port, () =>
    console.log(`🚀  App running at http://localhost:${port}`)
  );
}

export default app;
