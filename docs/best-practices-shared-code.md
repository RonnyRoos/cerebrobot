# Best Practices: Sharing Code Between Backend and Frontend

## Purpose
Document proven patterns for maintaining `packages/chat-shared` and sharing code between `apps/server` and `apps/client` in a TypeScript monorepo.

## Current Architecture (Validated ✅)

### 1. Shared Package Pattern
**What we do:**
```
packages/
  chat-shared/          # Shared contract layer
    src/
      schemas/          # Zod schemas (runtime validation)
      types/            # TypeScript types (compile-time)
      constants/        # Shared constants
    __tests__/          # Schema validation tests
```

**Why it works:**
- Single source of truth for API contracts
- TypeScript compiler finds all usages across apps
- Changes propagate automatically via monorepo workspace
- Zero code duplication for domain models

**Constitution alignment:**
- ✅ **Type Safety**: Zod schemas + TypeScript types
- ✅ **KISS**: Simple package structure, no framework coupling
- ✅ **YAGNI**: Only what both apps need, nothing speculative

### 2. Zod for Runtime + Compile-Time Validation
**What we do:**
```typescript
// packages/chat-shared/src/schemas/chat.ts
export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  threadId: z.string().uuid().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Server validates at runtime
import { ChatRequestSchema } from '@cerebrobot/chat-shared';
const validated = ChatRequestSchema.parse(untrustedData); // throws if invalid

// Client gets compile-time safety
import type { ChatRequest } from '@cerebrobot/chat-shared';
const request: ChatRequest = { message: input }; // TypeScript checks
```

**Why it works:**
- Server trusts nothing: validates all incoming data
- Client catches bugs at compile time: TypeScript enforces contracts
- Single schema definition: change once, both sides update
- Self-documenting: schema IS the contract

**Avoid:**
- ❌ Separate type definitions (`.d.ts`) and validators (duplicates logic)
- ❌ Manual type guards (Zod generates them for free)
- ❌ Runtime validation without TypeScript types (lose compile-time safety)

### 3. Clear Separation of Concerns
**What belongs in chat-shared:**
- ✅ **Schemas**: Domain models (ChatRequest, MemoryEntry, ThreadMetadata)
- ✅ **Types**: Derived types, discriminated unions (ChatStreamEvent)
- ✅ **Constants**: Magic numbers, enums (WS_CLOSE_CODES, CONNECTION_LIMITS)
- ✅ **Utilities**: Pure validators, type guards (if truly shared)

**What does NOT belong:**
- ❌ **Business logic**: Stays in server/client
- ❌ **Framework code**: No React hooks, no Fastify plugins
- ❌ **Environment-specific**: No Node.js or browser APIs
- ❌ **Dependencies**: Minimal (only Zod for validation)

**Example (Current):**
```typescript
// ✅ GOOD: chat-shared exports schema + type
export const MemoryEntrySchema = z.object({
  content: z.string(),
  timestamp: z.string().datetime(),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

// ❌ BAD: Would put in chat-shared (business logic!)
export function saveMemoryToDatabase(entry: MemoryEntry) { ... }
```

### 4. Monorepo Workspace Configuration
**What we do:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// apps/server/package.json
{
  "dependencies": {
    "@cerebrobot/chat-shared": "workspace:*"
  }
}

// apps/client/package.json (same)
```

**Why it works:**
- `workspace:*` ensures always using local version
- Changes to chat-shared immediately visible in both apps
- Single `pnpm install` for entire monorepo
- TypeScript project references keep incremental builds fast

## Advanced Patterns (When to Add)

### 5. Discriminated Unions for Polymorphic Messages
**Current example (already using):**
```typescript
// packages/chat-shared/src/schemas/connection.ts
export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  message: z.string(),
  threadId: z.string().optional(),
});

export const PingMessageSchema = z.object({
  type: z.literal('ping'),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  PingMessageSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
```

**Why it's powerful:**
- TypeScript narrows type based on `type` field
- Exhaustive switch/case checking at compile time
- Server can pattern match: `if (msg.type === 'chat') { msg.message }` (TS knows shape)

**When to use:**
- ✅ WebSocket messages (multiple message types)
- ✅ Stream events (data, error, done)
- ✅ State machines (connection states)

### 6. Branded Types for Domain IDs (Future)
**Not yet implemented, add when needed:**
```typescript
// packages/chat-shared/src/types/branded.ts
export type ThreadId = string & { readonly __brand: 'ThreadId' };
export type UserId = string & { readonly __brand: 'UserId' };

// Constructor functions
export const ThreadId = (id: string): ThreadId => {
  if (!z.string().uuid().safeParse(id).success) {
    throw new Error('Invalid ThreadId');
  }
  return id as ThreadId;
};
```

**Benefits:**
- TypeScript prevents mixing IDs: `function getThread(id: ThreadId)` won't accept `UserId`
- Runtime validation at construction time
- Self-documenting function signatures

**When to add:**
- Phase 2+: When we have multiple ID types (user, thread, agent, memory)
- When bugs from ID confusion actually occur (YAGNI until then)

### 7. Versioned Schemas (Future - Phase 3+)
**Not needed yet, consider for public API:**
```typescript
// packages/chat-shared/src/schemas/chat.v1.ts
export const ChatRequestSchemaV1 = z.object({ ... });

// packages/chat-shared/src/schemas/chat.v2.ts
export const ChatRequestSchemaV2 = z.object({ ... }).extend({ newField: ... });

// Server supports both
import { ChatRequestSchemaV1, ChatRequestSchemaV2 } from '@cerebrobot/chat-shared';
const v1Result = ChatRequestSchemaV1.safeParse(data);
const v2Result = ChatRequestSchemaV2.safeParse(data);
```

**When to add:**
- Phase 3: When external clients consume API
- When breaking changes would break deployed clients
- NOT NOW: Single operator, client/server deployed together

## Anti-Patterns to Avoid

### ❌ 1. Circular Dependencies
**Bad:**
```typescript
// chat-shared imports from server (NEVER DO THIS)
import { DatabaseClient } from '@cerebrobot/server';

// Creates dependency cycle: server → chat-shared → server
```

**Rule:** chat-shared should have ZERO dependencies on apps/server or apps/client.

### ❌ 2. Framework Coupling
**Bad:**
```typescript
// chat-shared/src/hooks/useChatWebSocket.ts (React hook in shared package!)
export function useChatWebSocket() { ... }
```

**Why wrong:** Server can't use React hooks, defeats purpose of sharing.

**Correct:** Keep hooks in `apps/client/src/hooks/`, import types from chat-shared.

### ❌ 3. Environment-Specific Code
**Bad:**
```typescript
// chat-shared uses Node.js API
import { readFileSync } from 'fs'; // ❌ Won't work in browser

// chat-shared uses browser API
const ws = new WebSocket('...'); // ❌ Won't work in Node.js
```

**Rule:** chat-shared must be environment-agnostic (schemas, types, constants only).

### ❌ 4. Over-Validation (Paranoia)
**Bad:**
```typescript
// Validating every single field access
const message = ChatRequestSchema.parse(data);
const validated = z.string().parse(message.message); // ❌ Already validated!
```

**Rule:** Validate at boundaries (server receives data, client sends data). Trust validated data internally.

### ❌ 5. Mixing Concerns
**Bad:**
```typescript
// chat-shared/src/schemas/chat.ts
export const ChatRequestSchema = z.object({ ... });

// Business logic in schema file! ❌
export async function sendChatRequest(req: ChatRequest) {
  const response = await fetch('/api/chat', { ... });
  return response.json();
}
```

**Rule:** Schemas define shape, not behavior. Business logic stays in apps.

## Testing Shared Code

### Current Approach (Validated ✅)
```typescript
// packages/chat-shared/__tests__/chat-schema.test.ts
describe('ChatRequestSchema', () => {
  it('should accept valid chat request', () => {
    const valid = { message: 'Hello', threadId: uuid() };
    expect(() => ChatRequestSchema.parse(valid)).not.toThrow();
  });

  it('should reject empty message', () => {
    const invalid = { message: '' };
    expect(() => ChatRequestSchema.parse(invalid)).toThrow();
  });
});
```

**What to test:**
- ✅ Valid data passes
- ✅ Invalid data throws with clear error
- ✅ Optional fields work
- ✅ Type inference matches expected shape

**What NOT to test:**
- ❌ How server uses the schema (test in server tests)
- ❌ How client uses the schema (test in client tests)
- ❌ Integration between apps (test in E2E)

## Migration Strategy (When Adding New Shared Code)

### Step 1: Identify Duplication
Look for:
- Same type defined in server AND client
- Same constants defined twice
- Same validation logic duplicated

### Step 2: Move to chat-shared
```bash
# Create new schema file
touch packages/chat-shared/src/schemas/new-feature.ts

# Define Zod schema + export type
# Add to packages/chat-shared/src/index.ts exports
```

### Step 3: Update Consumers
```typescript
// Before: apps/server/src/types.ts
interface MyType { ... }

// After: apps/server/src/routes/my-route.ts
import { MyType } from '@cerebrobot/chat-shared';
```

### Step 4: Verify
```bash
pnpm lint    # TypeScript errors if imports wrong
pnpm test    # Shared tests + app tests pass
```

## Checklist for Adding Shared Code

- [ ] Is this code needed by BOTH server AND client? (If no, keep in single app)
- [ ] Is this a pure schema, type, or constant? (If has business logic, keep in app)
- [ ] Does it have zero environment dependencies? (No Node.js or browser APIs)
- [ ] Does it have minimal external dependencies? (Only Zod acceptable)
- [ ] Can it be tested in isolation? (Unit tests without mocking apps)
- [ ] Is it stable? (Frequent changes → keep in app until settled)

**If all ✅, add to chat-shared. Otherwise, keep in apps.**

## Real-World Examples from Cerebrobot

### ✅ Good: ChatStreamEvent (Thread Messages)
```typescript
// packages/chat-shared/src/schemas/connection.ts
export const ChatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), threadId: z.string() }),
  z.object({ type: z.literal('data'), delta: z.string() }),
  z.object({ type: z.literal('done'), usage: TokenUsageSchema.optional() }),
  z.object({ type: z.literal('error'), error: ChatErrorSchema }),
]);
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
```

**Why shared:**
- Server sends events, client receives
- Discriminated union enables type-safe pattern matching
- Changes to event shape caught at compile time in both apps

### ✅ Good: WS_CLOSE_CODES (WebSocket Constants)
```typescript
// packages/chat-shared/src/constants/websocket.ts
export const WS_CLOSE_CODES = {
  NORMAL: 1000,
  ABNORMAL: 1006,
  POLICY_VIOLATION: 1008,
  SERVER_ERROR: 1011,
} as const;
```

**Why shared:**
- Both server and client need same close codes
- `as const` gives literal types (1000, not number)
- Single definition prevents mismatch bugs

### ❌ Would Be Bad: useChatWebSocket Hook
```typescript
// ❌ DON'T PUT THIS IN chat-shared
export function useChatWebSocket(url: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  // React-specific, client-only, NOT shared
}
```

**Why NOT shared:**
- React hooks only work in client
- Business logic for connection management
- Uses browser WebSocket API
- **Correct location:** `apps/client/src/hooks/useChatWebSocket.ts`

## Tools and Maintenance

### Auto-Import Organization (ESLint)
```json
// .eslintrc.json (already configured)
{
  "rules": {
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal"],
      "newlines-between": "always"
    }]
  }
}
```

**Ensures:** chat-shared imports stay organized and visible.

### TypeScript Project References (Future Optimization)
```json
// packages/chat-shared/tsconfig.json (when build gets slow)
{
  "compilerOptions": {
    "composite": true,
    "declaration": true
  }
}

// apps/server/tsconfig.json
{
  "references": [
    { "path": "../../packages/chat-shared" }
  ]
}
```

**Benefits:** Incremental builds, faster TypeScript compilation.

**When to add:** Phase 3+ when build times become noticeable (YAGNI for now).

## Summary: Decision Tree

```
Need to share code?
│
├─ NO (only one app needs it)
│  └─ Keep in apps/server or apps/client
│
└─ YES (both apps need it)
   │
   ├─ Is it a schema, type, or constant?
   │  │
   │  ├─ YES
   │  │  └─ Add to packages/chat-shared ✅
   │  │
   │  └─ NO (business logic, framework code)
   │     └─ Keep in apps, extract later if truly generic
   │
   └─ Does it depend on Node.js or browser APIs?
      │
      ├─ YES
      │  └─ Keep in apps (environment-specific) ❌
      │
      └─ NO
         └─ Add to packages/chat-shared ✅
```

## Related Documentation
- [Tech Stack Guardrails](./tech-stack.md) - Approved dependencies (Zod 4.1.11)
- [TypeScript Code Style](./code-style.md) - Import conventions, type system usage
- [Engineering Best Practices](./best-practices.md) - Testing, linting, hygiene loop

---

**Last Updated:** October 12, 2025  
**Status:** Active guideline for Phase 1.5+  
**Reviewed By:** Aligned with constitution v1.1.0 (KISS, Type Safety, YAGNI)
