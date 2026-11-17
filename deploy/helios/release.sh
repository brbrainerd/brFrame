#!/usr/bin/env bash
# Release origin/master to helios without GitHub Actions: build on helios's Docker daemon
# (ssh context), push to GHCR, promote through coolify-deploy-kit. Same pattern as
# ramada's deploy/helios/release.sh. Run from a clean checkout at origin/master.
#   bash deploy/helios/release.sh
# Needs ~/.config/brframe-deploy/COOLIFY_TOKEN and COOLIFY_APP_UUID (see README.md).
set -euo pipefail
cd "$(dirname "$0")/../.."
KIT="$(git rev-parse --path-format=absolute --git-common-dir)/../../coolify-deploy-kit"
CFG="$HOME/.config/brframe-deploy"
REPO=ghcr.io/brbrainerd/brframe
COOLIFY=http://helios.tail4f69a0.ts.net:8000
APP=$(cat "$CFG/COOLIFY_APP_UUID")
git fetch -q origin master
SHA=$(git rev-parse HEAD)
[ "$SHA" = "$(git rev-parse origin/master)" ] || { echo "HEAD is not origin/master" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "working tree is not clean" >&2; exit 1; }
docker context inspect helios >/dev/null 2>&1 ||
  docker context create helios --docker host=ssh://root@helios.tail4f69a0.ts.net >/dev/null
gh auth token | docker login ghcr.io -u brbrainerd --password-stdin >/dev/null
echo "building $SHA on helios"
docker --context helios build -q -t "$REPO:$SHA" .
docker --context helios push -q "$REPO:$SHA"
COOLIFY_TOKEN="$(cat "$CFG/COOLIFY_TOKEN")" COOLIFY_APP_UUID="$APP" COOLIFY_BASE_URL="$COOLIFY" \
  DEPLOY_GHCR_REPO=brbrainerd/brframe GHCR_IMAGE_WEB="$REPO:$SHA" node "$KIT/src/promote.mjs"
ssh -o BatchMode=yes root@helios.tail4f69a0.ts.net 'curl -fsS http://127.0.0.1:3430/api/health'
echo; echo "released $SHA"
