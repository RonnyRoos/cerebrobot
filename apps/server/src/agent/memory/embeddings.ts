/**
 * Embedding Service
 *
 * Generates vector embeddings for semantic memory search using DeepInfra.
 */

import OpenAI from 'openai';
import type { MemoryConfig } from './config.js';

/**
 * Generate embedding vector for text content
 *
 * Uses OpenAI SDK directly to ensure proper dimensions parameter support.
 * Qwen3-Embedding-8B supports MRL (Matryoshka Representation Learning)
 * which allows custom dimensions from 32 to 4096.
 *
 * @param text - Text to embed
 * @param config - Memory configuration
 * @returns 384-dimensional embedding vector, or null on failure
 */
export async function generateEmbedding(
  text: string,
  config: MemoryConfig,
): Promise<number[] | null> {
  try {
    // Use OpenAI SDK directly for full control over request parameters
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.embeddingEndpoint,
    });

    const response = await client.embeddings.create({
      input: text,
      model: config.embeddingModel,
      dimensions: 1536, // Request 1536 dimensions (under pgvector's 2000 limit for indexing)
      encoding_format: 'float',
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
      console.error('No embedding returned from API');
      return null;
    }

    // Log the dimensions we received
    console.log(`✓ Generated embedding with ${embedding.length} dimensions for model ${config.embeddingModel}`);

    return embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}
