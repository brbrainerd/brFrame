# brFrame on helios (Coolify)

brFrame emails a daily photo to a Pix-Star frame. The only thing that must happen daily is
`GET /api/cron` (Bearer `CRON_SECRET`). It used to be driven by Vercel Cron (`vercel.json`);
Vercel blocked the account, so nothing triggered it. On helios the trigger is a **Coolify
scheduled task** (`daily-frame`, `0 13 * * *`, container `app`) that calls the route from
inside the container, so no public route is needed. `/api/health` returns `lastCron`
(in-memory; the task's execution log in Coolify is the durable record).

One-time: `setup-coolify.sh` (see header for the files it reads). Each release: from a clean
checkout at origin/master, `bash deploy/helios/release.sh`. Host port `127.0.0.1:3430`.
