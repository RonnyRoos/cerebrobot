-- CreateTable
CREATE TABLE "global_configuration" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enable_markdown_responses" BOOLEAN NOT NULL DEFAULT false,
    "include_tool_references" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_configuration_pkey" PRIMARY KEY ("id")
);
