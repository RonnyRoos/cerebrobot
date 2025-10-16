# Contracts - Autonomy Extensions (009)

## Extension Pattern

This spec **extends** the foundation schemas from `008-migrate-to-events-effects`:

### Events (events.schema.ts)
- **From 008**: `user_message` event type, `SessionKeySchema`, `EventSchema` structure
- **Added in 009**: `timer` and `tool_result` event types + their payload schemas

### Effects (effects.schema.ts)
- **From 008**: `send_message` effect type, `EffectStatusSchema`, `EffectSchema` structure
- **Added in 009**: `schedule_timer` effect type + payload schema

### Timers (timers.schema.ts)
- **New in 009**: Timer-specific schemas for autonomy_timers table

## Implementation Notes

In the actual implementation, these contract files should:
1. **Import** foundation schemas from `apps/server/src/events/schemas.ts` (created in 008)
2. **Extend** the enums using Zod's `.extend()` or union patterns
3. **Add** new payload schemas alongside foundation types

The contract files here show the **final state** with both foundation and autonomy types for clarity, but the actual code should demonstrate clear extension rather than duplication.

## Source of Truth

- **008 contracts** define the Events & Effects foundation
- **009 contracts** extend with autonomy-specific types
- If there's a conflict, 008 foundation takes precedence for shared types (SessionKey, base EventSchema structure, etc.)
