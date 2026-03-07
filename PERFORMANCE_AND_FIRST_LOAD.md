# App performance and first-load delay

## Why the app doesn’t load on the first attempt

The backend is hosted on **Render** at `https://freelancing-platform-backend-backup.onrender.com`.

On **Render’s free tier**:

- The service **spins down after about 15 minutes** of no traffic.
- The **first request** after a spin-down has to **wake the server** (“cold start”), which often takes **30 seconds to 1–2 minutes**.
- After that, the server stays **warm** and responses are fast until it spins down again.

So:

- **First open (or after long idle):** The app calls the API → the server is cold → long wait or timeout → “never loads on first attempt.”
- **After 1–2 minutes or a retry:** The server is up → “works properly, every data loads.”

So the behaviour you see is mainly **Render free-tier cold start**, not a bug in your app logic.

---

## Is it because you haven’t taken a premium Render plan?

**Yes.** On a **paid plan** (e.g. paid Web Service with always-on instance):

- The service **does not spin down** (or spins down much less).
- There is **no (or very rare) cold start**.
- The **first request is fast** and the app “loads on first attempt” consistently.

So upgrading Render to a plan with an **always-on instance** is the way to get reliable first-load performance without waiting 1–2 minutes.

---

## What we did in the app to help (without changing Render)

These don’t remove cold start, but they make the app more tolerant of it:

1. **Longer API timeout**  
   Timeout was increased from 30s to **90 seconds** so the first request is less likely to fail while the server is waking.

2. **Automatic retry**  
   If a request times out or fails with a network error, the app **retries once** after 2 seconds. That often succeeds once the server has started.

3. **Backend warmup**  
   When the user is logged in:
   - On app launch we **ping** `GET /health` in the background to start waking the server.
   - When the app comes to **foreground** we ping again so the server is more likely to stay warm.

So:

- First load can still take **up to ~1–2 minutes** if the server was cold; the app should wait and/or retry instead of failing immediately.
- After the server is warm, everything loads normally.

---

## Summary

| Cause | What it is |
|-------|------------|
| **Render free tier** | Service spins down after ~15 min; first request after that = cold start (30s–2 min). |
| **Paid / premium Render** | Always-on instance → no spin-down → first load is fast. |

| In the app (already done) | What it does |
|---------------------------|--------------|
| 90s timeout | First request doesn’t fail too early while server is waking. |
| Retry on timeout/network error | One retry after 2s so first load can succeed once server is up. |
| Warmup ping on launch & foreground | Starts waking the server in the background so it’s ready sooner. |

For **consistent “loads on first attempt”** with no long wait, use a **Render plan with an always-on instance** (paid). The app changes above make the best of the free tier until then.
