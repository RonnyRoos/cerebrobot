# Backlog Notes – Agent-Scoped Memory Namespace

## Outstanding Follow-Ups

- **Operator tooling for namespace inspection**  
  Track whether the operator UI or CLI should expose agent-separated memory views. Today this remains manual via direct database queries.

- **Handling legacy memories without `thread.userId`**  
  Migration strategy is deferred; current runtime aborts and logs a critical error when `thread.userId` is missing. Evaluate whether a reporting script or admin tooling should surface orphaned rows post-upgrade.

Document owners should revisit these items when planning Phase 2 memory tooling or persistence enhancements.
