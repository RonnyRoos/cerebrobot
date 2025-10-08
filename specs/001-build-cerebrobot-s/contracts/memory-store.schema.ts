/**
 * Memory Store Contracts
 * 
 * TypeScript interfaces and types for the long-term memory system.
 * These contracts define the API surface for memory operations.
 */

import { z } from "zod";

// ============================================================================
// User Management Schemas
// ============================================================================

/**
 * Create User Request Schema
 * 
 * Used for name-based user creation on first visit.
 */
export const CreateUserRequestSchema = z.object({
  /** Human-readable name (e.g., "operator", "demo", "test") */
  name: z.string().min(1).max(100),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * Create User Response Schema
 */
export const CreateUserResponseSchema = z.object({
  /** Generated user UUID */
  userId: z.string().uuid(),
  
  /** User's name */
  name: z.string(),
  
  /** User creation timestamp */
  createdAt: z.string().datetime(),
});

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

// ============================================================================
// Core Memory Schemas
// ============================================================================

/**
 * Memory Entry Schema
 * 
 * Represents a single piece of stored knowledge in the memory system.
 */
export const MemoryEntrySchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string().uuid(),
  
  /** Namespace tuple for organizational scoping (e.g., ["memories", "user123"]) */
  namespace: z.array(z.string().min(1)).min(2),
  
  /** Unique key within the namespace */
  key: z.string().min(1),
  
  /** Memory content (max ~8KB = approx 2048 tokens) */
  content: z.string().min(1).max(8192),
  
  /** Optional flexible metadata as JSON */
  metadata: z.record(z.unknown()).optional(),
  
  /** Vector embedding for semantic search (384 dimensions for MiniLM-L6-v2) */
  embedding: z.array(z.number()).length(384).optional(),
  
  /** Creation timestamp */
  createdAt: z.date(),
  
  /** Last update timestamp */
  updatedAt: z.date(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

/**
 * Memory Search Result Schema
 * 
 * Extends MemoryEntry with similarity score for search results.
 */
export const MemorySearchResultSchema = MemoryEntrySchema.extend({
  /** Cosine similarity score (0-1, higher is more similar) */
  similarity: z.number().min(0).max(1),
});

export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>;

// ============================================================================
// Tool Input/Output Schemas
// ============================================================================

/**
 * upsertMemory Tool Input Schema
 * 
 * LLM-accessible tool for storing or updating memories.
 */
export const UpsertMemoryInputSchema = z.object({
  /** Memory content to store (required) */
  content: z.string().min(1).max(8192),
  
  /** Optional metadata as JSON object */
  metadata: z.record(z.unknown()).optional(),
  
  /** Optional key; auto-generated UUID if not provided */
  key: z.string().optional(),
});

export type UpsertMemoryInput = z.infer<typeof UpsertMemoryInputSchema>;

/**
 * upsertMemory Tool Output Schema
 */
export const UpsertMemoryOutputSchema = z.object({
  /** Indicates if operation succeeded */
  success: z.boolean(),
  
  /** UUID of created/updated memory */
  memoryId: z.string().uuid(),
  
  /** Human-readable result message */
  message: z.string(),
});

export type UpsertMemoryOutput = z.infer<typeof UpsertMemoryOutputSchema>;

// ============================================================================
// Store Interface
// ============================================================================

/**
 * Store Search Options
 */
export interface StoreSearchOptions {
  /** Minimum similarity threshold (default: 0.7) */
  threshold?: number;
  
  /** Maximum number of results (optional, returns all above threshold by default) */
  limit?: number;
}

/**
 * Base Store Interface
 * 
 * Defines the contract for memory storage operations.
 * Implementations must support persistence and semantic search.
 */
export interface BaseStore {
  /**
   * Store a memory entry
   * 
   * @param namespace - Namespace tuple (e.g., ["memories", "user123"])
   * @param key - Unique key within namespace
   * @param value - Memory entry to store
   */
  put(namespace: string[], key: string, value: MemoryEntry): Promise<void>;

  /**
   * Retrieve a memory entry by key
   * 
   * @param namespace - Namespace tuple
   * @param key - Unique key within namespace
   * @returns Memory entry or null if not found
   */
  get(namespace: string[], key: string): Promise<MemoryEntry | null>;

  /**
   * Search memories by semantic similarity
   * 
   * @param namespace - Namespace tuple to search within
   * @param query - Natural language query string
   * @param options - Search options (threshold, limit)
   * @returns Array of memories above similarity threshold, ordered by relevance
   */
  search(
    namespace: string[],
    query: string,
    options?: StoreSearchOptions
  ): Promise<MemorySearchResult[]>;

  /**
   * Delete a memory entry
   * 
   * @param namespace - Namespace tuple
   * @param key - Unique key within namespace
   */
  delete(namespace: string[], key: string): Promise<void>;

  /**
   * List all keys in a namespace
   * 
   * @param namespace - Namespace tuple
   * @returns Array of keys
   */
  list(namespace: string[]): Promise<string[]>;
}

// ============================================================================
// Graph State Extension
// ============================================================================

/**
 * Memory-enabled Graph State
 * 
 * Extends the existing MessagesState with memory-specific fields.
 */
export interface MemoryState {
  /** User identifier for namespace scoping */
  userId: string;
  
  /** Retrieved memories injected into LLM context */
  retrievedMemories?: MemorySearchResult[];
  
  /** Pending memory operations from LLM tool calls */
  memoryOperations?: UpsertMemoryInput[];
  
  /** Existing fields from MessagesState */
  messages: any[]; // BaseMessage[] from @langchain/core
  summary?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Memory Configuration Schema
 */
export const MemoryConfigSchema = z.object({
  /** Enable/disable memory features */
  enabled: z.boolean().default(true),
  
  /** Embedding service endpoint (OpenAI-compatible) */
  embeddingEndpoint: z.string().url().default("https://api.deepinfra.com/v1/openai"),
  
  /** Embedding model name */
  embeddingModel: z.string().default("sentence-transformers/all-MiniLM-L6-v2"),
  
  /** Similarity threshold for retrieval (0-1) */
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  
  /** Maximum tokens per memory content */
  contentMaxTokens: z.number().int().positive().default(2048),
  
  /** Maximum memories to retrieve (safety limit) */
  maxRetrievedMemories: z.number().int().positive().default(20).optional(),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate memory content size
 * 
 * @param content - Memory content string
 * @param maxTokens - Maximum allowed tokens
 * @throws Error if content exceeds token limit
 */
export function validateMemoryContent(content: string, maxTokens: number = 2048): void {
  // Approximate token count: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(content.length / 4);
  
  if (estimatedTokens > maxTokens) {
    throw new Error(
      `Memory content exceeds ${maxTokens} token limit (estimated: ${estimatedTokens} tokens)`
    );
  }
  
  if (content.trim().length === 0) {
    throw new Error("Memory content cannot be empty");
  }
}

/**
 * Validate namespace format
 * 
 * @param namespace - Namespace tuple
 * @throws Error if namespace is invalid
 */
export function validateNamespace(namespace: string[]): void {
  if (namespace.length < 2) {
    throw new Error("Namespace must have at least 2 elements (type + identifier)");
  }
  
  if (namespace.some(part => !part.trim())) {
    throw new Error("Namespace elements cannot be empty");
  }
}

/**
 * Build user-scoped namespace
 * 
 * @param userId - User identifier
 * @returns Namespace tuple ["memories", userId]
 */
export function buildUserNamespace(userId: string): string[] {
  validateNamespace(["memories", userId]); // Validate before returning
  return ["memories", userId];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Memory system constants
 */
export const MEMORY_CONSTANTS = {
  /** Default similarity threshold */
  DEFAULT_SIMILARITY_THRESHOLD: 0.7,
  
  /** Maximum content size in tokens */
  MAX_CONTENT_TOKENS: 2048,
  
  /** Approximate characters per token */
  CHARS_PER_TOKEN: 4,
  
  /** Maximum content size in characters (approx) */
  MAX_CONTENT_CHARS: 8192,
  
  /** Default embedding dimensions (MiniLM-L6-v2) */
  EMBEDDING_DIMENSIONS: 384,
  
  /** Safety limit on retrieved memories */
  MAX_RETRIEVED_MEMORIES: 20,
  
  /** Namespace types */
  NAMESPACE_TYPES: {
    USER_MEMORIES: "memories",
    SHARED: "shared", // Future use
  },
} as const;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Memory-specific error classes
 */
export class MemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryError";
  }
}

export class MemoryValidationError extends MemoryError {
  constructor(message: string) {
    super(message);
    this.name = "MemoryValidationError";
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(namespace: string[], key: string) {
    super(`Memory not found: ${namespace.join("/")}/${key}`);
    this.name = "MemoryNotFoundError";
  }
}

export class MemoryStorageError extends MemoryError {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "MemoryStorageError";
  }
}
