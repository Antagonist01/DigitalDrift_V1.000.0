// routes/posts.js — Blog post CRUD routes

import express from "express";
import { getDB } from "../db/index.js";
import { requireAuth, requireOwner } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}


// GET / — public: list all posts
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/auth/login"); // ← ADD THIS
  try {
    const sql = getDB();
    // Join with users so we can show real display names
    const posts = await sql`
      SELECT p.*, u.display_name AS author_name, u.avatar_url
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.date DESC
    `;
    res.render("index", { posts, fmtDate, user: req.user || null });
  } catch (err) {
    console.error("GET / error:", err.message);
    res.status(500).render("error", { message: err.message, user: req.user || null });
  }
});

// GET /new — auth required
router.get("/new", requireAuth, (req, res) => {
  res.render("modify", {
    heading: "New Post",
    submit: "Publish Post",
    post: null,
    user: req.user,
  });
});

// POST /posts — auth + write rate limit
router.post("/", requireAuth, writeLimiter, async (req, res) => {
  const { title, content } = req.body;
  try {
    const sql = getDB();
    await sql`
      INSERT INTO posts (title, content, author, user_id)
      VALUES (${title}, ${content}, ${req.user.display_name}, ${req.user.id})
    `;
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts error:", err.message);
    res.status(500).render("error", { message: err.message, user: req.user });
  }
});

// GET /edit/:id — auth + ownership required
router.get("/edit/:id", requireAuth, requireOwner(getDB), (req, res) => {
  res.render("modify", {
    heading: "Edit Post",
    submit: "Update Post",
    post: req.post,
    user: req.user,
  });
});

// POST /posts/:id — auth + ownership + write rate limit
router.post("/:id", requireAuth, requireOwner(getDB), writeLimiter, async (req, res) => {
  const { title, content } = req.body;
  try {
    const sql = getDB();
    await sql`
      UPDATE posts
      SET
        title   = COALESCE(NULLIF(${title},   ''), title),
        content = COALESCE(NULLIF(${content}, ''), content)
      WHERE id = ${req.params.id}
    `;
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts/:id error:", err.message);
    res.status(500).render("error", { message: err.message, user: req.user });
  }
});

// GET /posts/delete/:id — auth + ownership + write rate limit
router.get("/delete/:id", requireAuth, requireOwner(getDB), writeLimiter, async (req, res) => {
  try {
    const sql = getDB();
    await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
    res.redirect("/");
  } catch (err) {
    console.error("DELETE error:", err.message);
    res.status(500).render("error", { message: err.message, user: req.user });
  }
});

export default router;
