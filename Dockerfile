FROM node:26-bookworm-slim AS base
RUN npm install -g pnpm@10
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# next build validates the cron env at import time; these are build-only placeholders
# (real values come from Coolify at runtime and are never baked in).
RUN CRON_SECRET=build FRAME_EMAIL=build@example.com REDDIT_CLIENT_ID=build REDDIT_CLIENT_SECRET=build pnpm exec next build

FROM node:26-bookworm-slim
WORKDIR /app
COPY --from=build --chown=node:node /repo/.next/standalone ./
COPY --from=build --chown=node:node /repo/.next/static ./.next/static
COPY --from=build --chown=node:node /repo/public ./public
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 TZ=America/New_York
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD \
  node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
USER node
CMD ["node", "server.js"]
