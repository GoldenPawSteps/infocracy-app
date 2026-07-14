# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV npm_config_update_notifier=false
ENV npm_config_fund=false
ENV npm_config_audit=false
ENV NO_UPDATE_NOTIFIER=true
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
ENV CHECKPOINT_DISABLE=1
ENV DISABLE_PRISMA_TELEMETRY=true

# Install dependencies first (layer caching)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm --silent ci --include=dev

# Generate Prisma client
RUN npx prisma generate --no-hints

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV npm_config_update_notifier=false
ENV npm_config_fund=false
ENV npm_config_audit=false
ENV NO_UPDATE_NOTIFIER=true
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
ENV CHECKPOINT_DISABLE=1
ENV DISABLE_PRISMA_TELEMETRY=true

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm --silent ci --omit=dev && \
  npx prisma generate --no-hints && \
  rm -rf /root/.npm

# Copy built output
COPY --from=builder /app/dist ./dist

# Add runtime dependencies needed by Prisma and health checks
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl openssl && \
  rm -rf /var/lib/apt/lists/*

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
