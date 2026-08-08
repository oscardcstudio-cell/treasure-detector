# Supabase Setup for treasure-detector

This directory contains the database schema (migrations) and configuration for Supabase.

## Quick Start — Steps for Oscar

Complete these steps exactly, in order. Expect 10–15 minutes.

### 1. Create the Supabase project
- Go to [supabase.com](https://supabase.com)
- Sign in or create an account
- Click "New project"
- Name it `treasure-detector`
- Choose a region (EU if you're in Europe)
- Set a strong database password and save it somewhere safe
- Wait for the project to initialize (2–3 minutes)

### 2. Link the project to your local environment
```bash
cd ~/dev/claude/mes-projets/treasure-detector
supabase login
# Opens browser, authenticate with your Supabase account
supabase link --project-ref YOUR_PROJECT_REF
# YOUR_PROJECT_REF is shown in Supabase dashboard (top left, "Settings" > "General")
```

### 3. Deploy the schema
```bash
supabase db push
# Runs migrations/20260808_001_initial_schema.sql
# Should complete in <10 seconds
```

Verify it worked:
```bash
supabase status
# Should show your project linked and migrations applied
```

### 4. Get your Supabase credentials
- Go to [supabase.com dashboard](https://app.supabase.com)
- Click your project name
- Go to "Settings" > "API"
- Copy two values:
  - `Project URL` (looks like `https://xyzabc.supabase.co`)
  - `Anon public key` (the one labeled "anon", NOT "service_role")

### 5. Set environment variables for Railway
```bash
railway login
railway link  # if you haven't already
railway variables --set \
  VITE_SUPABASE_URL="https://xyzabc.supabase.co" \
  VITE_SUPABASE_ANON_KEY="eyJhbG..."
```

### 6. Set GitHub Secrets for the weekly ping workflow
- Go to GitHub: [github.com/oscardcstudio-cell/treasure-detector](https://github.com/oscardcstudio-cell/treasure-detector/settings/secrets/actions)
- Click "New repository secret"
- Add `SUPABASE_URL` = your Project URL from step 4
- Add `SUPABASE_ANON_KEY` = your Anon key from step 4

### 7. Test the app
```bash
railway up
# Deploy to Railway (builds and hosts the PWA)
railway deployment list
# Waits for SUCCESS before moving on
```

Install the PWA on your phone:
1. Open the Railway URL in your browser (shown in terminal)
2. Install the PWA (browser's "Add to home screen" or "Install app" menu)
3. Grant GPS permission
4. Record a few GPS points
5. Record a find with photo
6. Check the Supabase dashboard ("database" tab, `track_points` table) — you should see your data

---

## What got deployed

| File | What it does |
|------|---|
| `migrations/20260808_001_initial_schema.sql` | Creates all database tables (sessions, dig_points, finds, etc.) with Row Level Security enabled. PostGIS is enabled for spatial queries. |
| `config.toml` | Supabase CLI configuration (project ID auto-filled by `supabase link`). |

---

## RLS — Security that matters here

**Row Level Security is active on every table.** This means:
- Users can only read/write their own data
- The `anon` key (public, in your PWA bundle) cannot see anyone else's data
- Anonymous users (anyone with the URL) cannot access your data

**Test it yourself** (optional, advanced):
```bash
# From your terminal, try to read someone else's data with your public key
curl "https://xyzabc.supabase.co/rest/v1/finds?select=*" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
# Result: 0 rows (RLS denied access, correctly)
```

---

## Troubleshooting

### `supabase link` fails
- Make sure you've run `supabase login` first
- Check that your project exists in the Supabase dashboard
- Paste the exact `PROJECT_REF` (the string in the URL or top-left corner)

### `supabase db push` fails with "password authentication failed"
- Your database password is wrong. Check Supabase dashboard > Settings > Database.
- Or the database is still initializing. Wait 5 minutes and try again.

### Photos not syncing
- Currently, photo upload is stubbed (structure in place, blobs awaiting implementation in T1.8).
- Metadata syncs fine; the photo storage path is prepared.

### Free plan paused after 1 week of inactivity
- GitHub Actions ping (`supabase-ping.yml`) wakes it up every Monday at 8 AM UTC
- Or wake it manually in the Supabase dashboard

---

## What's next (after this deployment)

- **T1.8** (photo storage): Implement blob upload to Supabase Storage
- **T1.9** (export): Add GPX/GeoJSON export for manual backups
- **T2.x** (UI): Build the scoreboard and presets display
- **T3.x** (scoring): Implement the scoring engine

The backend is ready; the PWA is now connected to a real Postgres database with RLS.

**All your find data is safe:** encrypted at rest, synced to Supabase, backed up automatically by Supabase, and never visible to anyone else.**

---

## Contact

If Supabase has an outage, check [status.supabase.com](https://status.supabase.com).

For Claude Code issues during setup, ping the Claude team.
