# ─── Dependencies stage ───────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_update_notifier=false
ENV npm_config_fund=false
ENV npm_config_audit=false
ENV NO_UPDATE_NOTIFIER=true

COPY package*.json ./
RUN npm --silent ci

# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG BACKEND_INTERNAL_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public exists even when the repository has no public assets.
RUN mkdir -p public

RUN npm --silent run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create the runtime user/group referenced by COPY --chown and USER.
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_update_notifier=false
ENV npm_config_fund=false
ENV npm_config_audit=false
ENV NO_UPDATE_NOTIFIER=true

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=${PORT:-3000} exec node server.js"]
