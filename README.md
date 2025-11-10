# Cerebrobot

## Mission Snapshot
- Self-hostable LangGraph chatbot with transparent, operator-controlled memory.
- Prioritizes Phase 1 loop: single agent, inspectable hotpath memory, Fastify API, lightweight UI.
- Keeps seams open for future persistence, multi-agent orchestration, and operator tooling.

## Development Setup
1. Install prerequisites: Node.js 20.11+, pnpm 9.
2. Clone the repo and install deps:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env` (adjust LangGraph agent settings as desired).

## Test Database Setup

Cerebrobot uses **separate PostgreSQL containers** for production and testing to ensure clean logs and complete isolation:

- **Production**: `postgres` service → `localhost:5432` → `cerebrobot` database
- **Test**: `postgres-test` service → `localhost:5434` → `cerebrobot_test` database

### Running Tests

1. **Start the test database** (first time or after stopping):
   ```bash
   ./scripts/start-test-db.sh
   ```
   This starts the `postgres-test` container, waits for it to be healthy, and applies all migrations.

2. **Run the test suite**:
   ```bash
   pnpm test
   ```

3. **Stop the test database** (optional, to free resources):
   ```bash
   ./scripts/stop-test-db.sh
   ```

### Why Separate Containers?

- **Clean logs**: Test errors (e.g., duplicate key violations from constraint tests) don't appear in production postgres logs
- **Resource isolation**: Independent connection pools, memory, and process space
- **Independent lifecycle**: Restart or debug test database without affecting production

> **Note**: The `postgres-test` container uses Docker Compose profile `["test"]`, so it won't start automatically with `docker compose up`. You must use the helper scripts to manage it.

## Workspace Commands
- Run lint/format/tests (hygiene loop):
  ```bash
  pnpm lint
  pnpm format:write
  pnpm test
  ```
- Start the server (Fastify SSE API):
  ```bash
  pnpm --filter @cerebrobot/server dev
  ```
- Start the client (Vite + React UI):
  ```bash
  pnpm --filter @cerebrobot/client dev
  ```

### Full stack via Docker Compose

To run Postgres, apply Prisma migrations, and launch both backend and client together:

```bash
docker compose up
```

This will build/run four services:

- `postgres` — database with health checks and persisted volume.
- `migrate` — one-shot Prisma migration runner (exits when migrations finish).
- `backend` — Fastify/LangGraph server on port `3030`.
- `client` — Vite dev server on port `5173` proxied to the backend (`/api/*`).

Stop the stack with `docker compose down` (add `-v` to remove volumes).

### Manual persistence check

1. With the stack running, interact with the client at `http://localhost:5173/`.
2. Inspect saved checkpoints:
   ```bash
   docker compose exec postgres psql -U cerebrobot -d cerebrobot -c "SELECT thread_id, checkpoint_id, octet_length(checkpoint) AS checkpoint_bytes, updated_at FROM \"LangGraphCheckpoint\" ORDER BY updated_at DESC LIMIT 5;"
   ```
3. You should see entries even after restarting the backend container.

The server reads configuration from environment variables (see `.env.example`). Restart the process after changing agent parameters.

## Hot-Path Memory Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `LANGMEM_HOTPATH_LIMIT` | `10` | Maximum number of recent raw messages kept verbatim before summarization trims older turns. |
| `LANGMEM_HOTPATH_TOKEN_BUDGET` | `3000` | Token budget for the recent message window; exceeding it triggers summarization. |
| `LANGMEM_RECENT_MESSAGE_FLOOR` | `4` | Minimum number of latest messages that stay unsummarized even if the budget is exceeded. |
| `LANGMEM_HOTPATH_MARGIN_PCT` | `0` | Headroom reserved inside the token budget (e.g. `0.1` keeps utilisation below 90%). |

## Agent Configuration

Cerebrobot supports multiple agent personalities through JSON configuration files. Each agent has its own LLM settings, memory configuration, and system prompt.

### JSON Configuration Structure

Agent configs are stored in `config/agents/*.json`. Each file defines a complete agent with the following structure:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Assistant",
  "systemPrompt": "You are a helpful, friendly AI assistant. Be concise and clear in your responses.",
  "personaTag": "assistant",
  "llm": {
    "model": "deepseek-ai/DeepSeek-V3.1-Terminus",
    "temperature": 0.7,
    "apiKey": "YOUR_DEEPINFRA_API_KEY_HERE",
    "apiBase": "https://api.deepinfra.com/v1/openai"
  },
  "memory": {
    "hotPathLimit": 1000,
    "hotPathTokenBudget": 1024,
    "recentMessageFloor": 2,
    "hotPathMarginPct": 0.3,
    "embeddingModel": "Qwen/Qwen3-Embedding-8B",
    "embeddingEndpoint": "https://api.deepinfra.com/v1/openai",
    "similarityThreshold": 0.5,
    "maxTokens": 2048,
    "injectionBudget": 1000,
    "retrievalTimeoutMs": 5000
  }
}
```

**Field Reference:**

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Globally unique identifier | Must be valid UUID v4 |
| `name` | string | Human-readable name (shown in UI) | Required, min 1 char |
| `systemPrompt` | string | Core personality prompt sent to LLM | Required, min 1 char |
| `personaTag` | string | Persona identifier (e.g., "assistant", "professional") | Required, min 1 char |
| **LLM Configuration** | | | |
| `llm.model` | string | Model identifier (e.g., "deepseek-ai/DeepSeek-V3.1-Terminus") | Required, min 1 char |
| `llm.temperature` | number | Sampling temperature (0-2) | 0 ≤ value ≤ 2 |
| `llm.apiKey` | string | API key for LLM provider | Required, min 1 char |
| `llm.apiBase` | string | Base URL for API endpoint | Must be valid URL |
| **Memory Configuration** | | | |
| `memory.hotPathLimit` | number | Max recent messages kept verbatim | Positive integer |
| `memory.hotPathTokenBudget` | number | Token budget for hot path window | Positive integer |
| `memory.recentMessageFloor` | number | Min guaranteed unsummarized messages | Non-negative integer |
| `memory.hotPathMarginPct` | number | Headroom within token budget (0-1) | 0 ≤ value ≤ 1 |
| `memory.embeddingModel` | string | Model for generating embeddings | Required, min 1 char |
| `memory.embeddingEndpoint` | string | API endpoint for embedding generation | Must be valid URL |
| `memory.similarityThreshold` | number | Min similarity score for memory retrieval | 0 ≤ value ≤ 1 |
| `memory.maxTokens` | number | Max tokens for memory context injection | Positive integer |
| `memory.injectionBudget` | number | Token budget for injected memory | Positive integer |
| `memory.retrievalTimeoutMs` | number | Timeout for memory retrieval (ms) | Positive integer |

> **Upgrade note:** Memory namespaces now include the agent identifier: `['memories', <agentId>, <userId>]`. When upgrading a development environment from earlier builds, either export/import previous memories or reset the `memories` table (for example, `TRUNCATE memories`) before deploying updated binaries. Plan a bespoke migration for production installs where data retention matters.

### Multi-Agent Setup

**To add a new agent:**

1. **Create config file** in `config/agents/`:
   ```bash
   cp config/agents/template.json config/agents/my-new-agent.json
   ```

2. **Edit the config**:
   - Generate new UUID v4 for `id` (use `uuidgen` or online generator)
   - Set unique `name` (displayed in UI)
   - Customize `systemPrompt` for agent personality
   - Choose `personaTag` (used for logging/identification)
   - Adjust `llm.temperature` (lower = more focused, higher = more creative)
   - Configure `memory` settings (different agents can have different memory budgets)

3. **Validation**:
   - Config is validated on first use (fail-fast)
   - Invalid configs prevent server startup
   - Check logs for detailed validation errors
   - Use `config/agents/template.json` as reference

4. **Restart server** to discover new agent:
   ```bash
   docker compose restart backend
   # or
   pnpm --filter @cerebrobot/server dev
   ```

**File Naming:**
- Use kebab-case: `my-agent.json`, `technical-advisor.json`
- Exclude `template.json` (used as reference only)
- Files starting with `.` are ignored

**Example Agents:**
- `my-agent.json`: Friendly assistant (temperature 0.7, hotPathLimit 1000)
- `helpful-assistant.json`: Professional advisor (temperature 0.3, hotPathLimit 16)

### API Reference

#### GET /api/agents

Discover all available agent configurations.

**Response:**
```json
{
  "agents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Assistant",
      "description": ""
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Helpful Professional",
      "description": ""
    }
  ]
}
```

**Error Handling:**
- **500** if ANY config file is invalid (fail-fast validation)
- Response includes validation error details
- Falls back to `.env` config if no JSON files found

#### POST /api/thread

Create a new conversation thread with specified agent.

**Request:**
```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "optional-user-uuid",
  "previousThreadId": "optional-thread-to-reset"
}
```

**Response:**
```json
{
  "threadId": "generated-uuid"
}
```

**Validation:**
- `agentId` is validated against available configs
- **400** if agentId is invalid or not found
- Thread metadata stored in database with agentId

### Agent Selection Flow

**End-to-end flow:**

```
1. Frontend loads available agents:
   GET /api/agents → AgentPicker displays options

2. User selects agent from picker:
   AgentPicker → App.tsx → ChatView receives agentId

3. ChatView creates new thread:
   POST /api/thread { agentId } → Backend validates and creates thread
   Backend stores thread metadata: { threadId, agentId, userId }

4. User sends message:
   POST /api/chat { threadId, message, userId }

5. Backend processes message:
   - Load thread metadata by threadId
   - Extract agentId from metadata
   - Load agent config: loadAgentConfig(agentId)
   - Create ChatAgent with config
   - Process message with agent's LLM and memory settings
```

**Key Points:**
- Agent is selected ONCE when creating thread
- Thread remembers its agent via metadata
- Each message uses thread's original agent
- Different agents can have completely different personalities, models, and memory settings

## User Interface Features

Cerebrobot provides a responsive, accessible UI built with the Neon Flux design system:

### Navigation
- **Collapsible Sidebar**: 48px collapsed → 280px expanded (desktop), hover or click to expand
- **Mobile Bottom Nav**: On screens <768px, sidebar transforms to bottom navigation bar (icon-only)
- **Tablet Optimized**: On screens 768-1024px, sidebar expands to 200px to preserve chat space
- **Routes**: Threads, Agents, Memory, Settings with visual indicators for active route
- **Persistent State**: Sidebar expansion and active route saved in `localStorage`

### Memory Panel
- **Slide-in Panel**: Access memory graph during chat via 🧠 Memory button in header
- **Lazy Loading**: Memory data fetched only when panel first opened (performance optimization)
- **Focus Trap**: Keyboard navigation contained within panel (WCAG 2.1 AA compliant)
- **Mobile Full-Screen**: On screens <768px, panel becomes full-screen overlay for better usability
- **Tablet+ Slide-in**: 400px slide-in panel from right with backdrop on larger screens

### Agent Management
- **4-Step Wizard**: Guided agent creation with progress indicator
  - Step 1: Basic Info (name, system prompt, persona tag)
  - Step 2: LLM Configuration (model, temperature, API settings)
  - Step 3: Memory Settings (hot path, embeddings, retrieval)
  - Step 4: Review & Create with validation
- **Agent Cards**: Visual grid of configured agents with quick actions
- **Thread Filtering**: Filter threads by agent with dropdown or "Threads" button on agent cards

### Visual Enhancements
- **Message Bubbles**: Asymmetric layout with gradient backgrounds
  - User: Purple-pink gradient (right-aligned)
  - Agent: Blue-purple gradient (left-aligned)
  - Hover glows and fade-in animations
- **Thread Cards**: Glassmorphic design with hover effects, agent badges, message previews
- **Responsive Design**: Full mobile, tablet, and desktop support with appropriate breakpoints

### Accessibility
- **Keyboard Navigation**: Full Tab/Enter/Escape support across all interactive elements
- **Focus Indicators**: Visible 2px purple glow on keyboard focus (WCAG 2.1 AA)
- **ARIA Labels**: Screen reader support with proper roles and labels
- **121 A11y Tests**: Automated accessibility testing with vitest-axe

### LocalStorage Keys
- `cerebrobot:navigation-state`: Sidebar expansion and active route
- `cerebrobot:agent-filter`: Thread filtering by agent (auto-clears if agent deleted)

## Agent Context Mode

Cerebrobot supports multiple agent personalities with intelligent context-aware thread filtering:

### All Threads View (Default Landing Page)
- Shows **all conversation threads** from all agents
- Header displays "Conversations"
- Click **"+ New Conversation"** to select an agent and start a conversation

### Agent Context Mode
When you select an agent for a new conversation, you enter **Agent Context Mode** for that agent:

- **Header changes** to show: `🤖 {AgentName} Conversations`
- **Thread list filters** to show only threads for that agent
- **"+ New Conversation"** creates another thread with the **same agent** (no picker)
- **"← Back to All Threads"** button appears to exit context mode

### How It Works

1. **Starting fresh:**
   - From "All Threads" → Click "+ New Conversation"
   - Agent picker appears → Select agent (e.g., "My Assistant")
   - **Enters Agent Context Mode** for "My Assistant"
   - Chat opens with new thread

2. **In Agent Context Mode:**
   - Thread list shows only "My Assistant" threads
   - Click "+ New Conversation" → **No picker**, creates new "My Assistant" thread directly
   - Click "← Back to All Threads" → Returns to viewing all threads

3. **Resuming existing threads:**
   - From "All Threads" → Click any thread
   - Chat opens with that thread's agent
   - Click "← Back to Threads" → **Returns to "All Threads"** (not Agent Context)

### Why Agent Context Mode?

- **Focused workflows:** When working with a specific agent, stay in that context without re-selecting
- **Quick multi-turn sessions:** Create multiple threads with the same agent efficiently
- **Clear navigation:** Always know which view you're in (All Threads vs. Agent-specific)
- **Flexible switching:** Easy to move between agents or view everything

### Configuring Agents

Agents are defined in JSON configuration files (see `config/agents/template.json`). The UI dynamically loads available agents from the `/api/agents` endpoint.
