import { randomUUID } from 'node:crypto';
import {
  BaseCheckpointSaver,
  WRITES_IDX_MAP,
  copyCheckpoint,
  getCheckpointId,
  maxChannelVersion,
} from '@langchain/langgraph-checkpoint';
import type {
  ChannelVersions,
  Checkpoint,
  CheckpointMetadata,
  CheckpointPendingWrite,
  CheckpointTuple,
  PendingWrite,
} from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';
import { PrismaClient, type Prisma } from '@prisma/client';

interface PostgresOptions {
  readonly url: string;
  readonly schema?: string;
}

interface PrismaFactories {
  readonly createClient: (url: string) => PrismaClient;
}

function applySchemaToUrl(url: string, schema?: string): string {
  if (!schema) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}schema=${schema}`;
}

function createCompositeKey(threadId: string, namespace: string, checkpointId: string) {
  return { threadId, checkpointNamespace: namespace, checkpointId };
}

type CheckpointRecord = Prisma.LangGraphCheckpointGetPayload<{ include: { writes: true } }>;

function toBuffer(value: Uint8Array | Buffer | string): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export class PostgresCheckpointSaver extends BaseCheckpointSaver {
  private readonly prisma: PrismaClient;
  private readonly options: PostgresOptions;

  constructor(options: PostgresOptions, factories?: PrismaFactories) {
    super();
    this.options = options;
    const prismaUrl = applySchemaToUrl(options.url, options.schema);
    const createClient =
      factories?.createClient ??
      ((url: string) => new PrismaClient({ datasources: { db: { url } } }));
    this.prisma = createClient(prismaUrl);
  }

  public async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      return undefined;
    }
    const namespace = config.configurable?.checkpoint_ns ?? '';
    const targetId = getCheckpointId(config);
    const checkpoint = targetId
      ? await this.prisma.langGraphCheckpoint.findUnique({
          where: {
            checkpoint_lookup: createCompositeKey(threadId, namespace, targetId),
          },
          include: { writes: true },
        })
      : await this.prisma.langGraphCheckpoint.findFirst({
          where: {
            threadId,
            checkpointNamespace: namespace,
          },
          orderBy: { checkpointId: 'desc' },
          include: { writes: true },
        });

    if (!checkpoint) {
      return undefined;
    }

    return this.recordToTuple(checkpoint);
  }

  public async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig; filter?: Record<string, unknown> },
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    const namespace = config.configurable?.checkpoint_ns;
    const beforeId = options?.before?.configurable?.checkpoint_id;

    const checkpoints = await this.prisma.langGraphCheckpoint.findMany({
      where: {
        ...(threadId ? { threadId } : {}),
        ...(namespace ? { checkpointNamespace: namespace } : {}),
        ...(beforeId
          ? {
              checkpointId: {
                lt: beforeId,
              },
            }
          : {}),
      },
      orderBy: [{ threadId: 'asc' }, { checkpointNamespace: 'asc' }, { checkpointId: 'desc' }],
      take: options?.limit,
      include: { writes: true },
    });

    for (const record of checkpoints) {
      const metadata = await this.serde.loadsTyped('json', record.metadata);
      if (options?.filter) {
        const matches = Object.entries(options.filter).every(
          ([key, value]) => (metadata as Record<string, unknown>)[key] === value,
        );
        if (!matches) {
          continue;
        }
      }
      yield await this.recordToTuple(record, metadata);
    }
  }

  public async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      throw new Error('Failed to store checkpoint: missing thread_id in config.configurable');
    }
    const namespace = config.configurable?.checkpoint_ns ?? '';
    const parentId = config.configurable?.checkpoint_id ?? null;

    const preparedCheckpoint = copyCheckpoint(checkpoint);
    preparedCheckpoint.channel_versions = {
      ...(preparedCheckpoint.channel_versions ?? {}),
      ...newVersions,
    };

    const [[, serializedCheckpoint], [, serializedMetadata]] = await Promise.all([
      this.serde.dumpsTyped(preparedCheckpoint),
      this.serde.dumpsTyped(metadata),
    ]);

    await this.prisma.langGraphCheckpoint.upsert({
      where: {
        checkpoint_lookup: createCompositeKey(threadId, namespace, preparedCheckpoint.id),
      },
      update: {
        checkpointData: toBuffer(serializedCheckpoint),
        metadata: toBuffer(serializedMetadata),
        parentCheckpointId: parentId ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: preparedCheckpoint.id || randomUUID(),
        threadId,
        checkpointNamespace: namespace,
        checkpointId: preparedCheckpoint.id,
        parentCheckpointId: parentId ?? undefined,
        checkpointData: toBuffer(serializedCheckpoint),
        metadata: toBuffer(serializedMetadata),
      },
    });

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: namespace,
        checkpoint_id: preparedCheckpoint.id,
      },
    };
  }

  public async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const namespace = config.configurable?.checkpoint_ns ?? '';
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId || !checkpointId) {
      throw new Error('Failed to store checkpoint writes: missing thread_id or checkpoint_id');
    }

    // Ensure parent checkpoint exists before creating writes (to satisfy foreign key constraint)
    const existingCheckpoint = await this.prisma.langGraphCheckpoint.findUnique({
      where: {
        checkpoint_lookup: {
          threadId,
          checkpointNamespace: namespace,
          checkpointId,
        },
      },
    });

    // If checkpoint doesn't exist, we can't create writes due to FK constraint
    // This should not happen in normal flow - skip writes if checkpoint missing
    if (!existingCheckpoint) {
      return;
    }

    await Promise.all(
      writes.map(async ([channel, value], idx) => {
        const [, serializedValue] = await this.serde.dumpsTyped(value);
        const writeIndex = WRITES_IDX_MAP[channel] ?? idx;
        await this.prisma.langGraphCheckpointWrite.upsert({
          where: {
            write_lookup: {
              threadId,
              checkpointNamespace: namespace,
              checkpointId,
              taskId,
              writeIndex,
            },
          },
          update: {
            channel,
            value: toBuffer(serializedValue),
          },
          create: {
            id: randomUUID(),
            threadId,
            checkpointNamespace: namespace,
            checkpointId,
            taskId,
            writeIndex,
            channel,
            value: toBuffer(serializedValue),
          },
        });
      }),
    );
  }

  public async deleteThread(threadId: string): Promise<void> {
    await this.prisma.langGraphCheckpointWrite.deleteMany({ where: { threadId } });
    await this.prisma.langGraphCheckpoint.deleteMany({ where: { threadId } });
  }

  private async migratePendingSends(
    mutableCheckpoint: Checkpoint,
    threadId: string,
    namespace: string,
    parentCheckpointId: string,
  ): Promise<void> {
    const writes = await this.prisma.langGraphCheckpointWrite.findMany({
      where: {
        threadId,
        checkpointNamespace: namespace,
        checkpointId: parentCheckpointId,
      },
    });

    const pendingSends = await Promise.all(
      writes
        .filter((write) => write.channel === TASKS_CHANNEL)
        .map(async (write) => await this.serde.loadsTyped('json', write.value)),
    );

    if (pendingSends.length === 0) {
      return;
    }

    mutableCheckpoint.channel_values ??= {};
    mutableCheckpoint.channel_values[TASKS_CHANNEL] = pendingSends;
    mutableCheckpoint.channel_versions ??= {};
    mutableCheckpoint.channel_versions[TASKS_CHANNEL] =
      Object.keys(mutableCheckpoint.channel_versions).length > 0
        ? maxChannelVersion(...Object.values(mutableCheckpoint.channel_versions))
        : this.getNextVersion(undefined);
  }

  private async recordToTuple(
    record: CheckpointRecord,
    preloadedMetadata?: unknown,
  ): Promise<CheckpointTuple> {
    const [deserializedCheckpoint, metadata] = await Promise.all([
      this.serde.loadsTyped('json', record.checkpointData),
      preloadedMetadata !== undefined
        ? Promise.resolve(preloadedMetadata)
        : this.serde.loadsTyped('json', record.metadata),
    ]);

    const pendingWrites = await Promise.all(
      record.writes.map(
        async (write): Promise<CheckpointPendingWrite> => [
          write.taskId,
          write.channel,
          await this.serde.loadsTyped('json', write.value),
        ],
      ),
    );

    if (deserializedCheckpoint.v < 4 && record.parentCheckpointId) {
      await this.migratePendingSends(
        deserializedCheckpoint,
        record.threadId,
        record.checkpointNamespace,
        record.parentCheckpointId,
      );
    }

    const tuple: CheckpointTuple = {
      config: {
        configurable: {
          thread_id: record.threadId,
          checkpoint_ns: record.checkpointNamespace,
          checkpoint_id: record.checkpointId,
        },
      },
      checkpoint: deserializedCheckpoint,
      metadata,
      pendingWrites,
    };

    if (record.parentCheckpointId) {
      tuple.parentConfig = {
        configurable: {
          thread_id: record.threadId,
          checkpoint_ns: record.checkpointNamespace,
          checkpoint_id: record.parentCheckpointId,
        },
      };
    }

    return tuple;
  }
}

export type { PostgresOptions as PostgresCheckpointOptions };

const TASKS_CHANNEL = 'TASKS';
