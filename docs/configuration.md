# Configuration Guide

## Environment Variables

Cerebrobot uses environment variables for runtime configuration. All configuration is centralized in the server's `.env` file.

### Core Configuration

#### `NODE_ENV`
- **Type**: `development | production | test`
- **Default**: `development`
- **Description**: Runtime environment mode

#### `LOG_LEVEL`
- **Type**: `fatal | error | warn | info | debug | trace`
- **Default**: `info`
- **Description**: Pino logging level. Set to `debug` or `trace` for detailed troubleshooting.

### Database Configuration

#### `DATABASE_URL`
- **Type**: PostgreSQL connection string
- **Default**: `postgresql://cerebrobot:password@localhost:5432/cerebrobot`
- **Description**: PostgreSQL database connection string with pgvector extension enabled
- **Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`

### LLM Provider Configuration

#### `OPENAI_API_KEY`
- **Type**: String (API key)
- **Required**: Yes
- **Description**: API key for OpenAI-compatible LLM providers (e.g., DeepInfra, OpenAI)

#### `OPENAI_BASE_URL`
- **Type**: URL
- **Default**: `https://api.deepinfra.com/v1/openai`
- **Description**: Base URL for OpenAI-compatible API. Defaults to DeepInfra. Set to `https://api.openai.com/v1` for OpenAI.

### Embedding Configuration

#### `EMBEDDING_BASE_URL`
- **Type**: URL
- **Default**: `https://api.deepinfra.com/v1/openai`
- **Description**: Base URL for embedding API (OpenAI-compatible format)

#### `EMBEDDING_MODEL`
- **Type**: String (model identifier)
- **Default**: `BAAI/bge-base-en-v1.5`
- **Description**: Embedding model for memory storage. Must output 768-dimensional vectors for default schema.

### Server Configuration

#### `PORT`
- **Type**: Number
- **Default**: `3000`
- **Description**: HTTP server port for Fastify

#### `HOST`
- **Type**: String
- **Default**: `0.0.0.0`
- **Description**: Server bind address. Use `0.0.0.0` for Docker, `localhost` for local-only access.

### Autonomy Configuration

Server-side autonomy allows agents to send proactive follow-up messages based on LLM-driven decisions.

#### `AUTONOMY_ENABLED`
- **Type**: `true | false`
- **Default**: `false`
- **Description**: Master switch for server-side autonomy features. When disabled, no autonomous messages are sent.

#### `AUTONOMY_MAX_CONSECUTIVE`
- **Type**: Number (integer)
- **Default**: `3`
- **Description**: Maximum consecutive autonomous messages allowed per session before requiring user interaction. Hard cap enforced by PolicyGates.

#### `AUTONOMY_COOLDOWN_MS`
- **Type**: Number (milliseconds)
- **Default**: `15000` (15 seconds)
- **Description**: Minimum time between autonomous messages in the same session. Prevents message spam.

#### `TIMER_POLL_INTERVAL_MS`
- **Type**: Number (milliseconds)
- **Default**: `5000` (5 seconds)
- **Description**: How often TimerWorker polls for due timers. Lower values = more responsive timers but higher DB load.

#### `EFFECT_POLL_INTERVAL_MS`
- **Type**: Number (milliseconds)
- **Default**: `500` (0.5 seconds)
- **Description**: How often EffectRunner polls for pending effects. Lower values = faster message delivery but higher CPU usage.

### Memory Configuration

#### `LANGMEM_HOTPATH_LIMIT`
- **Type**: Number (integer)
- **Default**: `50`
- **Description**: Maximum number of recent messages to keep in hot-path memory for context retrieval

#### `LANGMEM_HOTPATH_TOKEN_BUDGET`
- **Type**: Number (integer)
- **Default**: `5000`
- **Description**: Maximum token budget for hot-path memory context

## Agent Configuration

Individual agents are configured via JSON files in the `config/agents/` directory. See `config/agents/template.json` for a complete example.

### Agent File Structure

```json
{
  "id": "my-agent",
  "name": "My Agent",
  "systemPrompt": "You are a helpful assistant...",
  "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "temperature": 0.7,
  "maxTokens": 4096,
  "autonomy": {
    "enabled": true,
    "evaluatorModel": "deepseek/deepseek-chat",
    "maxFollowUpsPerSession": 3
  }
}
```

### Agent Configuration Fields

#### `id`
- **Type**: String (kebab-case)
- **Required**: Yes
- **Description**: Unique identifier for the agent. Used in API requests and file naming.

#### `name`
- **Type**: String
- **Required**: Yes
- **Description**: Human-readable agent name displayed in UI

#### `systemPrompt`
- **Type**: String
- **Required**: Yes
- **Description**: System prompt defining agent behavior and personality

#### `model`
- **Type**: String (model identifier)
- **Required**: Yes
- **Description**: LLM model for conversation (DeepInfra format, e.g., `meta-llama/Meta-Llama-3.1-70B-Instruct`)

#### `temperature`
- **Type**: Number (0.0 to 2.0)
- **Default**: `0.7`
- **Description**: Sampling temperature for response generation. Higher = more creative, lower = more deterministic.

#### `maxTokens`
- **Type**: Number (integer)
- **Default**: `4096`
- **Description**: Maximum tokens in agent responses

#### `autonomy.enabled`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable autonomous follow-up messages for this agent. Requires `AUTONOMY_ENABLED=true` globally.

#### `autonomy.evaluatorModel`
- **Type**: String (model identifier)
- **Default**: `deepseek/deepseek-chat`
- **Description**: LLM model used for autonomy meta-decisions (should scheduling follow-up?). Optimized for fast, cheap reasoning.

#### `autonomy.maxFollowUpsPerSession`
- **Type**: Number (integer)
- **Default**: `3`
- **Description**: Per-agent limit on consecutive autonomous messages. Must be ≤ `AUTONOMY_MAX_CONSECUTIVE`.

## Production Recommendations

### Performance Tuning

- **Database**: Use connection pooling in production (Prisma handles this automatically)
- **Polling Intervals**: Increase `TIMER_POLL_INTERVAL_MS` and `EFFECT_POLL_INTERVAL_MS` to reduce DB/CPU load if autonomy not critical
- **Logging**: Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` in production to reduce log volume

### Security

- **API Keys**: Use strong, unique API keys and rotate regularly
- **Database**: Use read-only connection strings where possible, restrict network access
- **Reverse Proxy**: Deploy behind nginx/Caddy with rate limiting for public deployments

### Autonomy Safety

- **Hard Caps**: Keep `AUTONOMY_MAX_CONSECUTIVE` low (≤5) to prevent runaway conversations
- **Cooldowns**: Use `AUTONOMY_COOLDOWN_MS ≥ 10000` to avoid message spam
- **Agent-Specific**: Disable autonomy per-agent if not needed via `autonomy.enabled=false`

## Docker Compose Configuration

See `docker-compose.yml` for the full setup. Key services:

- **postgres**: PostgreSQL 16 with pgvector extension
- **cerebrobot-server**: Fastify backend (uses `.env` for configuration)

Environment variables are read from `.env` file in project root.
