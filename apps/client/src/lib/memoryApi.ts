/**
 * Memory API Client
 *
 * Type-safe HTTP client for memory CRUD operations.
 * Uses shared schemas from @cerebrobot/chat-shared for validation.
 */

import {
  type MemoryListResponse,
  type MemorySearchResponse,
  type MemoryStatsResponse,
  type MemoryCreateRequest,
  type MemoryUpdateRequest,
  type MemoryOperationResponse,
} from '@cerebrobot/chat-shared';
import { fetchApi, getJson, postJson } from '../lib/api-client.js';

/**
 * Memory API client (skeleton for Phase 2)
 *
 * Implementations will be added in user story tasks:
 * - US1: getMemories (T019)
 * - US2: searchMemories (T033)
 * - US3: updateMemory (T049), deleteMemory (T050)
 * - US4: createMemory (T064)
 * - US5: getMemoryStats (T076)
 */
export const memoryApi = {
  /**
   * List memories with pagination
   * Implementation: User Story 1 (T019)
   */
  async getMemories(params: {
    threadId: string;
    offset?: number;
    limit?: number;
  }): Promise<MemoryListResponse> {
    const query = new URLSearchParams({
      threadId: params.threadId,
      ...(params.offset !== undefined && { offset: params.offset.toString() }),
      ...(params.limit !== undefined && { limit: params.limit.toString() }),
    });

    return getJson<MemoryListResponse>(`/api/memory?${query}`);
  },

  /**
   * Search memories by semantic similarity
   * Implementation: User Story 2 (T033)
   */
  async searchMemories(params: {
    threadId: string;
    query: string;
    offset?: number;
    limit?: number;
    threshold?: number;
  }): Promise<MemorySearchResponse> {
    const queryParams = new URLSearchParams({
      threadId: params.threadId,
      query: params.query,
      ...(params.offset !== undefined && { offset: params.offset.toString() }),
      ...(params.limit !== undefined && { limit: params.limit.toString() }),
      ...(params.threshold !== undefined && { threshold: params.threshold.toString() }),
    });

    return getJson<MemorySearchResponse>(`/api/memory/search?${queryParams}`);
  },

  /**
   * Get memory capacity statistics
   * Implementation: User Story 5 (T076)
   */
  async getMemoryStats(threadId: string): Promise<MemoryStatsResponse> {
    const query = new URLSearchParams({ threadId });
    return getJson<MemoryStatsResponse>(`/api/memory/stats?${query}`);
  },

  /**
   * Create a new memory manually
   * Implementation: User Story 4 (T064)
   */
  async createMemory(params: {
    threadId: string;
    request: MemoryCreateRequest;
  }): Promise<MemoryOperationResponse> {
    const query = new URLSearchParams({ threadId: params.threadId });
    return postJson<MemoryOperationResponse>(`/api/memory?${query}`, params.request);
  },

  /**
   * Update an existing memory
   * Implementation: User Story 3 (T049)
   */
  async updateMemory(params: {
    memoryId: string;
    request: MemoryUpdateRequest;
  }): Promise<MemoryOperationResponse> {
    return fetchApi<MemoryOperationResponse>(`/api/memory/${params.memoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.request),
    });
  },

  /**
   * Delete a memory
   * Implementation: User Story 3 (T050)
   */
  async deleteMemory(memoryId: string): Promise<MemoryOperationResponse> {
    return fetchApi<MemoryOperationResponse>(`/api/memory/${memoryId}`, {
      method: 'DELETE',
    });
  },
};
