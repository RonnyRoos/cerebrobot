/*
  Warnings:

  - You are about to drop the column `fire_at` on the `timers` table. All the data in the column will be lost.
  - Added the required column `fire_at_ms` to the `timers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_timers_status_fireat";

-- AlterTable
ALTER TABLE "timers" DROP COLUMN "fire_at",
ADD COLUMN     "fire_at_ms" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "idx_timers_status_fireat" ON "timers"("status", "fire_at_ms");
