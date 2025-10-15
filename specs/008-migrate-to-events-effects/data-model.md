# Data Model: Events & Effects Migration

**Feature**: 008-migrate-to-events-effects  
**Date**: 2025-10-15

## Entities

### Event
- **Purpose**: Immutable user message input
- **Attributes**: id (UUID), session_key (TEXT), seq (INTEGER), type (`user_message`), payload (JSONB: `{text: string}`), created_at (TIMESTAMPTZ)
- **Constraints**: UNIQUE(session_key, seq)
- **Relationships**: One SESSION_KEY → Many events

### Effect
- **Purpose**: Agent response awaiting delivery
- **Attributes**: id (UUID), session_key (TEXT), checkpoint_id (TEXT), type (`send_message`), payload (JSONB: `{content: string}`), dedupe_key (TEXT UNIQUE), status (`pending|executing|completed|failed`), created_at, updated_at, attempt_count (INT default 0), last_attempt_at (TIMESTAMPTZ nullable)
- **Relationships**: One checkpoint → Many effects

### SESSION_KEY
- **Format**: `userId:agentId:threadId`
- **Purpose**: Partition key for event/effect isolation

## Prisma Schema

```prisma
model Event {
  id         String   @id @default(uuid()) @db.Uuid
  sessionKey String   @map("session_key")
  seq        Int
  type       String   // 'user_message'
  payload    Json     // { text: string }
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([sessionKey, seq])
  @@index([sessionKey, seq])
  @@map("events")
}

model Effect {
  id            String    @id @default(uuid()) @db.Uuid
  sessionKey    String    @map("session_key")
  checkpointId  String    @map("checkpoint_id")
  type          String    // 'send_message'
  payload       Json      // { content: string }
  dedupeKey     String    @unique @map("dedupe_key")
  status        String    @default("pending")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  attemptCount  Int       @default(0) @map("attempt_count")
  lastAttemptAt DateTime? @map("last_attempt_at") @db.Timestamptz

  @@index([status, createdAt], map: "idx_effects_status_created")
  @@index([sessionKey])
  @@map("effects")
}
```

**Note**: Spec 009 will add Timer model. Events/effects tables support extensibility via JSONB type field.
