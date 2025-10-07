import { MemorySaver } from '@langchain/langgraph-checkpoint';
import type { ServerConfig } from '../config.js';
import { PostgresCheckpointSaver, type PostgresCheckpointOptions } from './postgres-checkpoint.js';

const POSTGRES_SAVERS = new Map<string, PostgresCheckpointSaver>();

function getPostgresSaver(options: PostgresCheckpointOptions): PostgresCheckpointSaver {
  const key = `${options.url}|${options.schema ?? ''}`;
  let saver = POSTGRES_SAVERS.get(key);
  if (!saver) {
    saver = new PostgresCheckpointSaver(options);
    POSTGRES_SAVERS.set(key, saver);
  }
  return saver;
}

export function createCheckpointSaver(config: ServerConfig) {
  if (config.persistence.provider === 'postgres' && config.persistence.postgres) {
    return getPostgresSaver(config.persistence.postgres);
  }
  return new MemorySaver();
}
