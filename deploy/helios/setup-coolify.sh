#!/usr/bin/env bash
# One-time: create the brframe Coolify app, its env vars (read BY NAME from a 0600 env
# file; values are never printed) and the daily scheduled task. Writes COOLIFY_APP_UUID.
#   ~/.config/brframe-deploy/COOLIFY_TOKEN   Coolify API token (deploy,read,write)
#   ~/.config/brframe-deploy/env             KEY=value lines: CRON_SECRET FRAME_EMAIL
#     REDDIT_CLIENT_ID REDDIT_CLIENT_SECRET and (RESEND_API_KEY RESEND_FROM_EMAIL | GMAIL_USER GMAIL_APP_PASSWORD)
set -euo pipefail
CFG="$HOME/.config/brframe-deploy"
C=http://helios.tail4f69a0.ts.net:8000/api/v1
T=$(cat "$CFG/COOLIFY_TOKEN")
api() { curl -fsS -H "Authorization: Bearer $T" -H "Content-Type: application/json" "$@"; }
# Fill these from `GET $C/projects`, `/servers`, `/github-apps` (ramada runbook: GitHub App fableforge-gh).
: "${PROJECT_UUID:?}" "${SERVER_UUID:?}" "${GITHUB_APP_UUID:?}"
APP=$(api -X POST "$C/applications/private-github-app" -d "{
  \"project_uuid\":\"$PROJECT_UUID\",\"server_uuid\":\"$SERVER_UUID\",\"environment_name\":\"production\",
  \"github_app_uuid\":\"$GITHUB_APP_UUID\",\"git_repository\":\"brbrainerd/brFrame\",\"git_branch\":\"master\",
  \"build_pack\":\"dockercompose\",\"docker_compose_location\":\"/docker-compose.ghcr.yml\",
  \"ports_exposes\":\"3000\",\"name\":\"brframe\",\"autogenerate_domain\":false,\"is_auto_deploy_enabled\":false
}" | jq -r .uuid)
echo "$APP" > "$CFG/COOLIFY_APP_UUID"
while IFS='=' read -r k v; do
  [ -n "$k" ] && api -X POST "$C/applications/$APP/envs" -d "$(jq -nc --arg k "$k" --arg v "$v" '{key:$k,value:$v}')" >/dev/null
done < <(grep -E '^[A-Z_]+=' "$CFG/env")
api -X POST "$C/applications/$APP/envs" -d '{"key":"GHCR_IMAGE_WEB","value":"ghcr.io/brbrainerd/brframe:placeholder"}' >/dev/null
# 13:00 UTC = 8 AM EST (9 AM EDT). Command must be <=255 chars (Coolify varchar).
api -X POST "$C/applications/$APP/scheduled-tasks" -d "$(jq -nc '{name:"daily-frame",frequency:"0 13 * * *",container:"app",enabled:true,
  command:"node -e \"fetch('http://127.0.0.1:3000/api/cron',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})\""}')"
echo "created app $APP"
