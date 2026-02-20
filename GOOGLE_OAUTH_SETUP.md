# How to get Google OAuth credentials (free, 5 minutes)

## Step 1 — Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. Click the project dropdown (top left) → **New Project**
3. Name it anything (e.g. "My Blog") → **Create**
4. Make sure your new project is selected in the dropdown

## Step 2 — Enable the Google People API

1. Go to **APIs & Services → Library**
2. Search for **"Google+ API"** or **"Google Identity"**
3. Click **Enable**

## Step 3 — Configure OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** → **Create**
3. Fill in:
   - App name: `My Blog` (anything)
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through all steps (no need to add scopes manually)
5. On the final screen, click **Back to Dashboard**

## Step 4 — Create OAuth credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `My Blog`
5. Under **Authorised redirect URIs**, click **+ Add URI** and add:
   - For local dev:  `http://localhost:3000/auth/google/callback`
   - For Vercel:     `https://YOUR-PROJECT.vercel.app/auth/google/callback`
6. Click **Create**
7. A popup shows your **Client ID** and **Client Secret** — copy both

## Step 5 — Add to your .env file

```
GOOGLE_CLIENT_ID="paste-your-client-id-here"
GOOGLE_CLIENT_SECRET="paste-your-client-secret-here"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

## Step 6 — Add to Vercel Environment Variables

In Vercel → BlogTest → Settings → Environment Variables, add:

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | your client ID |
| `GOOGLE_CLIENT_SECRET` | your client secret |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-PROJECT.vercel.app/auth/google/callback` |
| `SESSION_SECRET` | a long random string |

To generate a SESSION_SECRET, run in your terminal:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 7 — Run the migration

```bash
node db/migrate.js
```

This adds the `users`, `session` tables and `user_id` column to `posts`.
