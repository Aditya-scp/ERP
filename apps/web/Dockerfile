FROM node:24-alpine AS base
RUN npm install -g pnpm@12.11.2

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key

RUN pnpm --filter @erp/web build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
