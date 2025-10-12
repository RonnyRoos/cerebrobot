# Quickstart: Dynamic Agent Configuration

**Feature**: 004-agent-definition-we  
**Date**: October 10, 2025  
**Audience**: Operators setting up Cerebrobot with custom agent personalities

## Overview

This guide walks you through migrating from `.env`-based agent configuration to JSON files, creating new agent personalities, and selecting them via the UI.

## Prerequisites

- Cerebrobot server installed and previously working with `.env` configuration
- Filesystem access to the repo root directory
- Basic understanding of JSON format
- UUID generator (online tool or Node.js CLI)

## Step 1: Create the Configuration Directory

Create a git-ignored directory to store your agent configurations:

```bash
cd /path/to/cerebrobot
mkdir -p config/agents
```

**Important**: This directory is automatically git-ignored to protect your API keys and secrets.

## Step 2: Generate Your First Agent Configuration

### Option A: Copy from Template (Recommended)

The template file will be created automatically during implementation. For now, create your first agent manually:

```bash
# Generate a UUID for your agent
node -e "console.log(crypto.randomUUID())"
# Output: 550e8400-e29b-41d4-a716-446655440000

# Create your agent config file
touch config/agents/my-assistant.json
```

### Option B: Migrate from Existing .env

Convert your current `.env` settings to JSON format:

**Current .env values** → **New JSON structure**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Custom Assistant",
  "systemPrompt": "You are a helpful, professional AI assistant. You provide clear, accurate information and assist users with their tasks efficiently. Maintain a friendly but professional tone.",
  "personaTag": "assistant",
  "llm": {
    "model": "deepseek-ai/DeepSeek-V3.1-Terminus",
    "temperature": 0.7,
    "apiKey": "K6X3RHYeiqUGxx11setuOP6h9uksRKhi",
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

Save this to `config/agents/my-assistant.json`.

## Step 3: Validate Your Configuration

Start the server to test your configuration:

```bash
pnpm dev
```

**Expected output** (success):
```
[INFO] Agent configurations loaded (count=1, ids=['550e8400-e29b-41d4-a716-446655440000'])
[INFO] Server listening at http://localhost:3030
```

**Common errors** and fixes:

### Error: "Agent config validation failed: id must be a valid UUID v4"
**Fix**: Replace the `id` field with a properly formatted UUID v4 (use the generator command above).

### Error: "Agent config validation failed: temperature must be between 0 and 2"
**Fix**: Set `llm.temperature` to a value between 0 and 2 (e.g., 0.7).

### Error: "Failed to parse agent config: Unexpected token"
**Fix**: Validate your JSON syntax using a JSON validator (https://jsonlint.com/).

### Error: "Agent config directory not found: ./config/agents"
**Fix**: Create the directory: `mkdir -p config/agents`

## Step 4: Create Additional Agent Personalities

To add more personalities, create additional JSON files:

```bash
# Generate a new UUID for each agent
node -e "console.log(crypto.randomUUID())"
# Output: 6ba7b810-9dad-11d1-80b4-00c04fd430c8

# Create a professional variant
cat > config/agents/professional-assistant.json <<'EOF'
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "Professional Assistant",
  "systemPrompt": "You are a professional, courteous AI assistant. Provide clear, accurate, and helpful responses in a business-appropriate tone.",
  "personaTag": "professional",
  "llm": {
    "model": "deepseek-ai/DeepSeek-V3.1-Terminus",
    "temperature": 0.5,
    "apiKey": "your-api-key-here",
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
EOF
```

Restart the server to load the new configuration:

```bash
# Stop the server (Ctrl+C)
pnpm dev
```

**Expected output**:
```
[INFO] Agent configurations loaded (count=2, ids=['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'])
```

## Step 5: Select an Agent in the UI

1. Open the Cerebrobot frontend: http://localhost:5173
2. Look for the agent selector dropdown (typically in the header or sidebar)
3. Select your desired agent personality from the list
4. Start a new conversation - the selected agent's personality will be active

**Note**: Switching agents requires starting a new conversation. Existing conversations retain their original agent selection.

## Step 6: Clean Up .env (Optional)

Once you've confirmed JSON configs work, you can remove the old environment variables from `.env`:

```bash
# Keep these infrastructure settings:
# - DATABASE_URL
# - POSTGRES_*
# - LANGGRAPH_PG_URL
# - FASTIFY_PORT
# - CLIENT_PORT
# - VITE_API_BASE

# Remove these (now in JSON):
# - LANGGRAPH_SYSTEM_PROMPT
# - LANGGRAPH_PERSONA_TAG
# - LANGCHAIN_MODEL
# - LANGCHAIN_TEMPERATURE
# - DEEPINFRA_API_KEY
# - DEEPINFRA_API_BASE
# - LANGMEM_*
# - MEMORY_*
```

**Backward compatibility**: If you remove `.env` variables and the `config/agents/` directory, the server will fail to start. Keep at least one valid JSON config or restore the `.env` settings.

## Troubleshooting

### Server won't start after adding config directory

**Symptom**: Server exits immediately with error
**Cause**: Invalid JSON or missing required fields
**Fix**: Check the error message for the specific field causing validation failure. Common issues:
- Missing comma between fields
- Unquoted field values (numbers and booleans don't need quotes, but strings do)
- Invalid UUID format (must be UUID v4, not random string)
- URL fields missing `https://` prefix

### Config changes not reflected

**Symptom**: Updated JSON config but agent behavior unchanged
**Cause**: Server caches configs at startup, no hot-reloading
**Fix**: Restart the server (`Ctrl+C` then `pnpm dev`)

### UI doesn't show my new agent

**Symptom**: Added config file but it doesn't appear in the dropdown
**Cause**: Either validation failed (check server logs) or file named `template.json` (reserved name)
**Fix**: 
- Check server logs for validation errors
- Rename file if it's `template.json`
- Ensure file has `.json` extension

### API key exposed in git

**Symptom**: Accidentally committed config file with secrets
**Cause**: `.gitignore` not properly configured
**Fix**:
```bash
# Verify .gitignore includes config/agents/*
cat .gitignore | grep "config/agents"

# If missing, add it:
echo "config/agents/*" >> .gitignore
echo "!config/agents/.gitkeep" >> .gitignore
echo "!config/agents/template.json" >> .gitignore

# Remove from git history (if already committed):
git rm --cached config/agents/*.json
git commit -m "Remove agent configs from git"

# Rotate compromised API key immediately
```

## Advanced Usage

### Using Different LLM Providers

Change the `llm.apiBase` field to use different OpenAI-compatible providers:

```json
{
  "llm": {
    "model": "gpt-4",
    "apiBase": "https://api.openai.com/v1",
    "apiKey": "sk-..."
  }
}
```

### Tuning Memory Parameters

Adjust memory settings for different conversation styles:

**High-context agent** (remembers more):
```json
{
  "memory": {
    "hotPathLimit": 2000,
    "hotPathTokenBudget": 2048,
    "maxTokens": 4096,
    "injectionBudget": 2000
  }
}
```

**Low-context agent** (faster, less memory):
```json
{
  "memory": {
    "hotPathLimit": 500,
    "hotPathTokenBudget": 512,
    "maxTokens": 1024,
    "injectionBudget": 500
  }
}
```

### Testing Without Modifying Production Configs

Create a test config with a temporary UUID:

```bash
cp config/agents/my-assistant.json config/agents/test-assistant.json
# Edit test-assistant.json, change id and name
# Test with: pnpm dev
# Delete when done: rm config/agents/test-assistant.json
```

## Next Steps

- Read [data-model.md](./data-model.md) for complete field reference
- Review [contracts/agents-api.yaml](./contracts/agents-api.yaml) for API details
- Check [research.md](./research.md) for implementation decisions

## Security Reminders

- ✅ Never commit `config/agents/*.json` files (except template)
- ✅ Rotate API keys if accidentally exposed
- ✅ Set restrictive file permissions: `chmod 600 config/agents/*.json`
- ✅ Use unique UUIDs for each agent (never reuse)
- ✅ Keep `.gitignore` updated to exclude agent configs

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Validate JSON syntax at https://jsonlint.com/
3. Review the error handling section in [data-model.md](./data-model.md)
4. Consult the Cerebrobot mission docs at [docs/mission.md](../../docs/mission.md)
