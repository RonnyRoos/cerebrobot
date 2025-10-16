-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "session_key" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effects" (
    "id" UUID NOT NULL,
    "session_key" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ,

    CONSTRAINT "effects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_session_key_seq_idx" ON "events"("session_key", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "events_session_key_seq_key" ON "events"("session_key", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "effects_dedupe_key_key" ON "effects"("dedupe_key");

-- CreateIndex
CREATE INDEX "idx_effects_status_created" ON "effects"("status", "created_at");

-- CreateIndex
CREATE INDEX "effects_session_key_idx" ON "effects"("session_key");
