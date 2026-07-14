# Infocracy — Production-Grade Governance Prediction Market

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](./backend/tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)

Infocracy is a governance system built around prediction markets and balance-based influence. Users stake tokens on discrete outcomes, and governance decisions are sampled from the resulting probability distribution. The system implements the **Logarithmic Market Scoring Rule (LMSR)** with server-authoritative, high-precision arithmetic.

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Market Mathematics](#market-mathematics)
- [Deployment](#deployment)
- [Security](#security)

---

## Core Concepts

| Primitive    | Description |
|-------------|-------------|
| **Balance**  | A user's liquid stake (starts at 1.0) |
| **Market**   | A multi-outcome prediction market |
| **Make**     | Create a market (costs `C(q)`; defaults to `b·ln(n)` when `q = 0`) |
| **Take**     | Trade outcome shares (`ΔC = C(q+Δq) − C(q)`) |
| **Unmake**   | Close and settle a market |
| **Influence**| Expected payoff from current positions |
| **Power**    | `Balance + Influence` — governs vote weight |

---

## Architecture

```
infocracy-app/
├── backend/              # Node.js + TypeScript + Express
│   ├── prisma/           # Database schema, migrations, seed
│   ├── src/
│   │   ├── middleware/   # Auth, CSRF, rate limiting, validation
│   │   ├── routes/       # REST API routes
│   │   ├── services/     # Business logic (market math, market lifecycle)
│   │   └── socket.ts     # Socket.io WebSocket layer
│   └── tests/            # Unit + integration tests (Jest)
├── frontend/             # Next.js 14 App Router + TypeScript
│   └── src/
│       ├── app/          # Pages (dashboard, markets, auth, profile)
│       ├── components/   # UI components (markets, leaderboard, layout)
│       ├── store/        # Zustand state management
│       └── lib/          # API client, socket, types
├── nginx/                # Reverse proxy configuration
├── docker-compose.yml    # Development stack
└── docker-compose.prod.yml # Production stack
```

**Tech Stack:**

| Layer       | Technology |
|-------------|-----------|
| Frontend    | Next.js 14, TypeScript, TailwindCSS, Zustand |
| Backend     | Node.js, TypeScript, Express |
| Database    | PostgreSQL 16 + Prisma ORM |
| Cache/PubSub | Redis 7 |
| Real-time   | Socket.io |
| Auth        | JWT (http-only cookies) + bcrypt |
| Validation  | Zod |
| Math        | decimal.js (50-digit precision) |

---

## Quick Start (Docker)

**Prerequisites:** Docker + Docker Compose

```bash
# 1. Clone the repository
git clone https://github.com/GoldenPawSteps/infocracy-app
cd infocracy-app

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 3. Start all services
docker-compose up --build

# 4. (Optional) Seed demo data
docker-compose exec backend npm run db:seed
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api
- **WebSocket:** http://localhost:4000

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7

### Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL

# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed demo data
npm run db:seed

# Start dev server (with hot reload)
npm run dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local

# Start dev server
npm run dev
```

### Running Tests

```bash
cd backend

# Unit tests (market math)
npm test -- tests/unit

# Integration tests (trade lifecycle)
npm test -- tests/integration

# All tests
npm test
```

---

## Environment Variables

### Root `.env` (used by Docker Compose)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Long random secret for JWT signing | `openssl rand -hex 64` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend API URL (build-time) | `http://localhost:4000/api` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL | `http://localhost:4000` |

### Backend `.env`

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | JWT expiry duration | `7d` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Runtime environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `BCRYPT_ROUNDS` | bcrypt work factor | `12` |
| `LOG_LEVEL` | pino log level | `info` |

### Frontend `.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket base URL |

---

## API Documentation

All endpoints are prefixed with `/api`. Authentication uses JWT stored in an `http-only` cookie. State-mutating endpoints also require a CSRF token (obtain from `GET /api/csrf`, send as `x-csrf-token` header).

### Authentication

#### `POST /api/auth/signup`
Create a new user account. Awards initial balance of **1.0**.

**Body:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securepassword"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "clx...",
    "username": "alice",
    "email": "alice@example.com",
    "balance": "1.0",
    "influence": "0",
    "power": "1.0",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/auth/signin`
Authenticate with email/username + password.

**Body:**
```json
{ "identifier": "alice", "password": "securepassword" }
```

#### `POST /api/auth/signout`
Clear authentication cookie.

#### `GET /api/auth/me`
Return current authenticated user with balance and power.

---

### Markets

#### `POST /api/markets` 🔐
Create a new market (Make). Deducts initial cost `C(q)` from maker's balance, where `q` is the optional `initialQ` vector (or all zeros when omitted).

**Body:**
```json
{
  "title": "Should we adopt quadratic funding?",
  "description": "A governance vote on funding mechanisms.",
  "outcomes": [
    { "name": "Yes" },
    { "name": "No" }
  ],
  "liquidityB": "0.25",
  "initialQ": ["1", "0"]
}
```

**Response:** `201 Created`
```json
{
  "market": {
    "id": "clx...",
    "title": "Should we adopt quadratic funding?",
    "nOutcomes": 2,
    "liquidityB": "0.25",
    "initialCost": "1.3288897342925496",
    "probabilities": ["0.9820137900379085", "0.01798620996209156"],
    "outcomes": [
      { "index": 0, "name": "Yes", "qValue": "1" },
      { "index": 1, "name": "No",  "qValue": "0" }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

`initialQ` is optional. If omitted, it defaults to a zero vector and this reduces to the previous initialization behavior.

#### `GET /api/markets`
List all active (unsettled) markets with current probabilities.

#### `GET /api/markets/:id`
Get full market detail including outcomes, probabilities, and positions.

#### `POST /api/markets/:id/trade` 🔐
Execute a trade (Take). `deltaQ[i]` is the change in shares for outcome `i` (positive = buy, negative = sell).

**Body:**
```json
{ "deltaQ": ["1", "0"] }
```

**Validations:**
- User cannot trade in their own market
- Cannot sell more shares than owned
- Must have sufficient balance

**Response:** `201 Created`
```json
{
  "trade": {
    "id": "clx...",
    "cost": "0.1732...",
    "balanceAfter": "0.8267...",
    "positionAfter": ["1", "0"],
    "probabilities": ["0.7310...", "0.2689..."],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/markets/:id/unmake` 🔐
Settle a market (Unmake). Only the market maker can call this.

Settlement formula:
- Each position holder receives: `∑ᵢ pᵢ · qᵢᵗ`
- Maker receives: `C(q) − ∑ₜ ∑ᵢ pᵢ · qᵢᵗ`

**Response:**
```json
{
  "settlement": {
    "marketId": "clx...",
    "probabilities": ["0.7310...", "0.2689..."],
    "settlements": [
      { "userId": "user_1", "payout": "0.4521..." },
      { "userId": "user_2", "payout": "0.2134..." }
    ]
  }
}
```

---

### Leaderboard

#### `GET /api/leaderboard`
Returns top users ranked by **Power = Balance + Influence**, updated dynamically.

**Query:** `?limit=50` (default: 50)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "clx...",
      "username": "alice",
      "balance": "1.4521",
      "influence": "0.3102",
      "power": "1.7623"
    }
  ]
}
```

---

### Governance

#### `POST /api/governance/:marketId/sample` 🔐
Sample a governance decision from the market's probability distribution. Logs the result.

**Body:**
```json
{ "seed": "optional-deterministic-seed" }
```

**Response:**
```json
{
  "sample": {
    "outcome": 0,
    "outcomeName": "Yes",
    "probability": "0.7310...",
    "seed": "optional-deterministic-seed",
    "logId": "clx..."
  }
}
```

---

### Health

#### `GET /api/health`
Returns `{ "ok": true }` — used by load balancers.

#### `GET /api/csrf`
Returns a CSRF token to include as `x-csrf-token` on state-mutating requests.

---

## WebSocket Events

Connect to the WebSocket server at `NEXT_PUBLIC_WS_URL`. All events are broadcast on the global channel.

| Event | Description | Payload |
|-------|-------------|---------|
| `market:created` | New market created | `{ market: Market }` |
| `market:traded` | Trade executed | `{ trade: TradeResult }` |
| `market:unmade` | Market settled | `{ settlement: Settlement }` |
| `leaderboard:updated` | Leaderboard changed | `LeaderboardEntry[]` |

**Example client:**
```typescript
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL);

socket.on('market:traded', (trade) => {
  console.log('New probabilities:', trade.probabilities);
});

socket.on('leaderboard:updated', (leaderboard) => {
  console.log('Top user:', leaderboard[0]);
});
```

---

## Database Schema

```
users           id, username, email, password_hash, created_at
balances        user_id → users, balance (string), updated_at
markets         id, maker_id → users, title, description, n_outcomes,
                liquidity_b, is_unmade, created_at, unmade_at
outcomes        id, market_id → markets, index, name, q_value
trades          id, market_id → markets, taker_id → users,
                delta_q (JSON), cost, created_at
positions       (user_id, market_id) composite PK, shares (JSON)
governance_logs id, market_id → markets, sampled_by → users,
                outcome, seed, created_at
```

All monetary values are stored as **decimal strings** (not floats) to avoid precision loss.

---

## Market Mathematics

The LMSR cost function with liquidity parameter `b > 0` and share vector `q`:

```
C(q) = b · ln( ∑ᵢ exp(qᵢ/b) )
```

**Numerical stability:** The implementation uses the log-sum-exp trick (subtracting the maximum value before exponentiating) to avoid overflow.

**Probabilities:**
```
pᵢ = exp(qᵢ/b) / ∑ⱼ exp(qⱼ/b)
```

**Trade cost:**
```
ΔC = C(q + Δq) − C(q)
```
Positive ΔC = cost to buyer. Negative ΔC = credit to seller.

**Influence:**
- Taker: `Iᵗ = ∑ᵢ pᵢ · qᵢᵗ`
- Maker: `Iᵐ = C(q) − ∑ₜ Iᵗ`

**Power:** `Balance + Influence`

All calculations use [decimal.js](https://mikemcl.github.io/decimal.js/) at 50-digit precision. The frontend never computes authoritative values.

---

## Deployment

### Vercel + Railway

1. Deploy backend to **Railway**:
   - Connect your GitHub repo
   - Set service root to `backend/`
   - Add environment variables (see table above)
   - Railway auto-detects Dockerfile

2. Deploy frontend to **Vercel**:
   - Connect your GitHub repo  
   - Set root directory to `frontend/`
   - Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to your Railway backend URL

### Production Docker

```bash
cp .env.example .env.prod
# Edit .env.prod with production secrets

docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

**Generate secrets:**
```bash
openssl rand -hex 64  # JWT_SECRET
```

---

## Security

| Control | Implementation |
|---------|---------------|
| Authentication | JWT in http-only, SameSite=Lax cookies |
| Password hashing | bcrypt (12 rounds) |
| CSRF protection | Double-submit cookie pattern (`x-csrf-token` header) |
| Rate limiting | 100 req/15min (general), 10 req/15min (auth endpoints) |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Prisma parameterized queries |
| XSS | helmet.js + Content-Security-Policy |
| Concurrency | `SERIALIZABLE` transactions with retry on serialization failure |
| Precision | decimal.js (50-digit) for all economic calculations |
| Structured logging | pino |

---

## License

MIT
