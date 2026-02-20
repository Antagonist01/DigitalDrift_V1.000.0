# Blog App — Express + EJS + Neon (Serverless PostgreSQL)

A clean, responsive blog with persistent PostgreSQL storage via **Neon** (free, forever tier — no credit card required), deployable to **Vercel** in minutes.

---

## Why Neon instead of AWS RDS / Azure SQL?

| | AWS RDS Free | Azure SQL Free | **Neon Free** |
|---|---|---|---|
| Credit card required | ✅ Yes | ✅ Yes | ❌ No |
| Expires | 12 months | 12 months | **Never** |
| Surprise charges | Common | Common | None |
| Connection type | TCP (breaks on Vercel) | TCP (breaks on Vercel) | **HTTP — works everywhere** |
| Setup time | ~20 min | ~20 min | **~2 min** |

> **TL;DR** — AWS RDS and Azure SQL both have a *12-month* free tier that requires a credit card and often generates surprise charges. Neon's free tier is **permanent**, requires no card, and its HTTP-based serverless driver works perfectly with Vercel's serverless functions. For a blog or side-project, Neon is the obvious pick.

---

## Architecture

```
Browser
  │
  ▼
Vercel (serverless function)
  └─ server.js  (Express — renders EJS, handles all routes)
        │
        ▼
  Neon Serverless PostgreSQL
  (HTTP connection via @neondatabase/serverless)
```

No separate API process. One Express app handles pages + data — perfect for Vercel.

---

## Quick Start (local)

### 1. Create a free Neon database

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign up (GitHub login works).
2. Click **New Project** → give it a name → **Create**.
3. On the dashboard, click **Connection Details** → choose **Node.js** → copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Clone & install

```bash
git clone <your-repo>
cd blog-app
npm install
```

### 3. Set up environment

```bash
cp .env.example .env
# Open .env and paste your DATABASE_URL from Neon
```

### 4. Initialise the database (run once)

```bash
npm run db:init
```

This creates the `posts` table and seeds 3 sample posts.

### 5. Start the app

```bash
npm run dev     # with auto-reload (Node 18+)
# or
npm start
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## Deploy to Vercel (free)

### 1. Push your code to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/blog-app.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repository.
3. Vercel auto-detects Node.js — no framework preset needed.
4. Under **Environment Variables**, add:
   ```
   DATABASE_URL = postgresql://...your neon connection string...
   ```
5. Click **Deploy**. Done ✅

### 3. (First deploy only) Run the DB init remotely

After deploying, run the init script once from your local machine pointing at Neon — it only needs the `DATABASE_URL` which you already set in `.env`:

```bash
npm run db:init
```

This is safe to run multiple times (uses `ON CONFLICT DO NOTHING`).

---

## Project Structure

```
blog-app/
├── db/
│   ├── index.js        ← Neon client (shared SQL helper)
│   └── init.js         ← One-time table creation + seeding
├── views/
│   ├── index.ejs       ← Post list page
│   ├── modify.ejs      ← Create / edit form
│   └── error.ejs       ← Error page
├── public/
│   └── styles/
│       └── main.css    ← All styles (pink + blue palette, responsive)
├── server.js           ← Express app (pages + actions, Vercel-ready)
├── vercel.json         ← Vercel routing config
├── .env.example        ← Environment variable template
└── package.json
```

---

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all posts |
| GET | `/new` | New post form |
| POST | `/posts` | Create a post |
| GET | `/edit/:id` | Edit form for a post |
| POST | `/posts/:id` | Update a post |
| GET | `/posts/delete/:id` | Delete a post |
| GET | `/healthz` | Health check (returns 200 OK) |

