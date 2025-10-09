-- AlterTable: Add deleted_at column to users table for soft delete support
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
