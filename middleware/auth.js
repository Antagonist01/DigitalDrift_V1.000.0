// middleware/auth.js — Authentication guards

// Redirect to login if not authenticated
export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;   // remember where they were going
  res.redirect("/auth/login");
}

// Check post ownership — user must own the post OR be an admin
// Attach post to req.post for the route handler to use
export function requireOwner(getDB) {
  return async (req, res, next) => {
    try {
      const sql = getDB();
      const [post] = await sql`SELECT * FROM posts WHERE id = ${req.params.id}`;
      if (!post) return res.status(404).render("error", { message: "Post not found.", user: req.user || null });

      const isOwner = post.user_id === req.user.id;
      if (!isOwner) {
        return res.status(403).render("error", {
          message: "You can only edit or delete your own posts.",
          user: req.user || null,
        });
      }

      req.post = post;   // pass to route
      next();
    } catch (err) {
      console.error("requireOwner error:", err.message);
      res.status(500).render("error", { message: err.message, user: req.user || null });
    }
  };
}
