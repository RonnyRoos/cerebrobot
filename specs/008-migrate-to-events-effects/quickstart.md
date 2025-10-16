# Quickstart: Migrate to Events & Effects Architecture

**Feature**: 008-migrate-to-events-effects  
**Audience**: Developers performing the migration

## Overview

This guide walks you through migrating existing user message handling from direct WebSocket sends to Events & Effects architecture.

## Prerequisites

- Node.js ≥20, PostgreSQL running
- Existing Cerebrobot server with WebSocket chat working
- Familiarity with Fastify, LangGraph, Prisma

## Migration Steps

### Step 1: Database Schema
1. Add Event, Effect models to `prisma/schema.prisma` (see data-model.md)
2. Run `pnpm prisma migrate dev --name add_events_effects_tables`
3. Run `pnpm prisma generate`

### Step 2: Create Foundation Components
1. Implement EventStore (`apps/server/src/events/events/EventStore.ts`)
2. Implement OutboxStore (`apps/server/src/events/effects/OutboxStore.ts`)
3. Implement EventQueue (`apps/server/src/events/events/EventQueue.ts`)
4. Copy contract schemas from `contracts/` to `apps/server/src/events/types/`

### Step 3: Implement SessionProcessor
1. Create SessionProcessor orchestration (`apps/server/src/events/session/SessionProcessor.ts`)
2. Integrate with LangGraph checkpointer
3. Test event → graph → effect flow

### Step 4: Implement EffectRunner
1. Create EffectRunner background worker (`apps/server/src/events/effects/EffectRunner.ts`)
2. Implement send_message effect execution with token streaming
3. Test outbox polling and WebSocket delivery

### Step 5: Refactor WebSocket Route
1. Modify `apps/server/src/chat/routes.ts`:
   - Create user_message events on message receive
   - Enqueue events in EventQueue
   - Remove direct agent.streamChat() calls
2. Add reconnection handler to trigger outbox poll

### Step 6: Testing
1. Run unit tests for all components
2. Run Postgres validation test
3. Manual smoke test: Send message, verify streaming works identically
4. Manual smoke test: Disconnect mid-response, reconnect, verify delivery

### Step 7: Deployment
1. Run hygiene loop: `pnpm lint` → `pnpm format:write` → `pnpm test`
2. Deploy to staging environment
3. Verify user experience unchanged
4. Deploy to production

## Detailed Implementation

*Complete implementation guide will be generated after Phase 0 Research and Phase 1 Design complete.*

**To generate detailed quickstart**: Complete research.md and data-model.md first.
