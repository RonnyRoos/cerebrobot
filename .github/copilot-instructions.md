# Cerebrobot Development Guidelines

**📌 Primary Reference: See [AGENTS.md](../AGENTS.md) for comprehensive agent instructions.**

This file provides quick-reference instructions for GitHub Copilot. For detailed guidance, workflows, and architectural decisions, always consult `AGENTS.md` and the referenced documentation.

---

## Quick Reference

### Setup Commands
```bash
pnpm install                                    # Install dependencies
pnpm lint → pnpm format:write → pnpm test      # Hygiene loop (run after changes)
pnpm dev                                        # Start development server
docker-compose up -d                            # Start services (PostgreSQL, etc.)
```

### Tech Stack (Phase 1.5)
- **Runtime**: Node.js ≥20, TypeScript 5.5+
- **Framework**: Fastify 5.6.1, LangGraph 0.4.9
- **AI**: LangChain 0.3.34, @langchain/core 0.3.77, @langchain/openai 0.3.4
- **Storage**: PostgreSQL + pgvector, Prisma 5.17.0
- **Validation**: Zod 4.1.11
- **Logging**: Pino 9.11.0

### Project Structure
```
apps/
  server/         # Fastify backend + LangGraph agent
  client/         # React frontend
packages/
  chat-shared/    # Shared types & schemas
prisma/           # Database schema & migrations
docs/             # Architecture & guidelines
specs/            # Feature specifications
```

### Key Principles
1. **Follow AGENTS.md** - Primary source of truth for agent workflows
2. **Use approved tech** - See [Tech Stack](../docs/tech-stack.md) for constraints
3. **Run hygiene loop** - `lint → format → test` before commits
4. **Test-driven** - Add tests with behavior changes
5. **Document decisions** - Use ADRs for deviations

### Essential Docs
- 🤖 **[AGENTS.md](../AGENTS.md)** - Agent instructions & workflows
- 🎯 **[docs/mission.md](../docs/mission.md)** - Vision & roadmap
- ⚙️ **[docs/tech-stack.md](../docs/tech-stack.md)** - Tech constraints
- 📋 **[docs/best-practices.md](../docs/best-practices.md)** - Engineering standards
- 💻 **[docs/code-style.md](../docs/code-style.md)** - TypeScript patterns

### Architecture Quick Links
- **Memory System**: [docs/architecture/userid-validation.md](../docs/architecture/userid-validation.md)
- **Tool Pattern**: [docs/architecture/langgraph-toolnode-pattern.md](../docs/architecture/langgraph-toolnode-pattern.md)

---

**⚠️ Important**: This is a summary only. For complete instructions, MCP server configs, working cadence, and detailed guidelines, see **[AGENTS.md](../AGENTS.md)**.

## Active Technologies
- TypeScript 5.5+, Node.js ≥20 + Fastify 5.6.1, React 18+, Prisma (latest), Zod 4.1.11 (011-agent-crud-ui)
- PostgreSQL with JSON/JSONB suppor (011-agent-crud-ui)

## Recent Changes
- 011-agent-crud-ui: Added TypeScript 5.5+, Node.js ≥20 + Fastify 5.6.1, React 18+, Prisma (latest), Zod 4.1.11
