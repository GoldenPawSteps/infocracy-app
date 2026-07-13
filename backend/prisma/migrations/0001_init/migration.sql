-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances" (
    "user_id" TEXT NOT NULL,
    "balance" TEXT NOT NULL DEFAULT '1.0',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "maker_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "n_outcomes" INTEGER NOT NULL,
    "liquidity_b" TEXT NOT NULL,
    "is_unmade" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unmade_at" TIMESTAMP(3),

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcomes" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "q_value" TEXT NOT NULL DEFAULT '0',

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "taker_id" TEXT NOT NULL,
    "delta_q" JSONB NOT NULL,
    "cost" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "shares" JSONB NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("user_id","market_id")
);

-- CreateTable
CREATE TABLE "governance_logs" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "sampled_by" TEXT NOT NULL,
    "outcome" INTEGER NOT NULL,
    "seed" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "markets_maker_id_idx" ON "markets"("maker_id");

-- CreateIndex
CREATE INDEX "markets_is_unmade_created_at_idx" ON "markets"("is_unmade", "created_at");

-- CreateIndex
CREATE INDEX "outcomes_market_id_idx" ON "outcomes"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "outcomes_market_id_index_key" ON "outcomes"("market_id", "index");

-- CreateIndex
CREATE INDEX "trades_market_id_created_at_idx" ON "trades"("market_id", "created_at");

-- CreateIndex
CREATE INDEX "trades_taker_id_created_at_idx" ON "trades"("taker_id", "created_at");

-- CreateIndex
CREATE INDEX "positions_market_id_idx" ON "positions"("market_id");

-- CreateIndex
CREATE INDEX "governance_logs_market_id_created_at_idx" ON "governance_logs"("market_id", "created_at");

-- CreateIndex
CREATE INDEX "governance_logs_sampled_by_created_at_idx" ON "governance_logs"("sampled_by", "created_at");

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_taker_id_fkey" FOREIGN KEY ("taker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_logs" ADD CONSTRAINT "governance_logs_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_logs" ADD CONSTRAINT "governance_logs_sampled_by_fkey" FOREIGN KEY ("sampled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

