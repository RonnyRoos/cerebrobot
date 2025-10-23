-- CreateTable
CREATE TABLE "timers" (
    "id" UUID NOT NULL,
    "session_key" TEXT NOT NULL,
    "timer_id" TEXT NOT NULL,
    "fire_at" TIMESTAMPTZ NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "timers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_timers_status_fireat" ON "timers"("status", "fire_at");

-- CreateIndex
CREATE INDEX "timers_session_key_idx" ON "timers"("session_key");

-- CreateIndex
CREATE UNIQUE INDEX "timers_session_key_timer_id_key" ON "timers"("session_key", "timer_id");
