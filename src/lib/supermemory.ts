import Supermemory from 'supermemory';

/**
 * Supermemory Environment Configuration & Client Setup
 *
 * Configured via environment variables:
 * - `SUPERMEMORY_API_KEY`: API bearer token (from https://console.supermemory.ai or local server)
 * - `SUPERMEMORY_BASE_URL`: Optional custom base URL (e.g. "http://localhost:6767" for Supermemory local)
 */
const apiKey = process.env.SUPERMEMORY_API_KEY;
const baseURL = process.env.SUPERMEMORY_BASE_URL;

export const supermemory = new Supermemory({
  apiKey: apiKey || '',
  ...(baseURL ? { baseURL } : {}),
});

/**
 * Returns true if Supermemory is configured with an API key or local baseURL.
 */
export function isSupermemoryConfigured(): boolean {
  return Boolean(apiKey || baseURL);
}

export type SupermemoryMetadata = Record<string, string | number | boolean | string[]>;

/**
 * Add a memory or document entry to Supermemory.
 *
 * @param content The text or content to index into memory.
 * @param containerTag Scoping tag per user or org (e.g. `user_${userId}`).
 * @param metadata Optional key-value metadata for filtering.
 */
export async function addMemory(
  content: string,
  containerTag: string,
  metadata?: SupermemoryMetadata
) {
  if (!isSupermemoryConfigured()) {
    console.warn('[supermemory] Skipped addMemory: SUPERMEMORY_API_KEY is not set');
    return null;
  }

  return await supermemory.add({
    content,
    containerTag,
    metadata,
  });
}

/**
 * Perform a semantic memory search.
 *
 * @param query Search query string.
 * @param containerTag Scoping tag (e.g. `user_${userId}`).
 * @param searchMode Search mode: "documents" (RAG) or "memories" (conversation entries).
 */
export async function searchMemories(
  query: string,
  containerTag: string,
  searchMode: 'documents' | 'memories' = 'documents'
) {
  if (!isSupermemoryConfigured()) {
    console.warn('[supermemory] Skipped searchMemories: SUPERMEMORY_API_KEY is not set');
    return { results: [] };
  }

  return await supermemory.search({
    q: query,
    containerTag,
    searchMode,
  });
}

/**
 * Retrieve maintained entity/user profile facts (static + dynamic).
 *
 * @param containerTag Scoping tag for the target entity (e.g. `user_${userId}`).
 */
export async function getUserProfile(containerTag: string) {
  if (!isSupermemoryConfigured()) {
    console.warn('[supermemory] Skipped getUserProfile: SUPERMEMORY_API_KEY is not set');
    return null;
  }

  return await supermemory.profile({
    containerTag,
  });
}

export default supermemory;
