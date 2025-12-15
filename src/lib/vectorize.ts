import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Embedding response from Workers AI
 */
interface EmbeddingResponse {
    shape: number[];
    data: number[][];
}

/**
 * Get Workers AI and Vectorize bindings
 */
async function getBindings() {
    const { env } = await getCloudflareContext({ async: true });
    return {
        ai: env.AI,
        vectorize: env.VECTORIZE,
    };
}

/**
 * Generate text embedding using Workers AI
 * Uses @cf/baai/bge-base-en-v1.5 model (768 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const { ai } = await getBindings();

    const response = await ai.run('@cf/baai/bge-base-en-v1.5', {
        text: [text],
    }) as EmbeddingResponse;

    return response.data[0];
}

/**
 * Create vector ID for datasource
 */
export function createVectorId(datasourceId: number): string {
    return `datasource:${datasourceId}`;
}

/**
 * Metadata stored with each vector
 */
interface DatasourceVectorMetadata {
    datasourceId: number;
    datasourceGroupId: number;
    content: string;
}

/**
 * Upsert vector to Vectorize index
 * Generates embedding and stores with datasource group metadata for filtering
 */
export async function upsertVector(
    datasourceId: number,
    datasourceGroupId: number,
    content: string
): Promise<void> {
    const { vectorize } = await getBindings();

    const vectorId = createVectorId(datasourceId);
    const embedding = await generateEmbedding(content);

    // Metadata with datasourceGroupId for filtering
    const metadata: Record<string, VectorizeVectorMetadata> = {
        datasourceId,
        datasourceGroupId,
        content,
    };

    await vectorize.upsert([{
        id: vectorId,
        values: embedding,
        metadata,
    }]);
}

/**
 * Delete vector from Vectorize index
 */
export async function deleteVector(datasourceId: number): Promise<void> {
    const { vectorize } = await getBindings();
    const vectorId = createVectorId(datasourceId);

    await vectorize.deleteByIds([vectorId]);
}

/**
 * Search vector result with typed metadata
 */
export interface SearchResult {
    id: string;
    score: number;
    metadata: DatasourceVectorMetadata;
}

/**
 * Search for similar vectors filtered by datasource group IDs
 * 
 * Uses Cloudflare Vectorize metadata filtering with $in operator
 * to filter by multiple datasource groups (many-to-many relationship)
 * 
 * @param query - The search query text
 * @param datasourceGroupIds - Array of datasource group IDs to filter by
 * @param topK - Number of results to return (default: 5)
 * @returns Matching vectors with scores and metadata
 * 
 * @see https://developers.cloudflare.com/vectorize/reference/metadata-filtering/
 */
export async function searchVectors(
    query: string,
    datasourceGroupIds: number[],
    topK: number = 5
): Promise<SearchResult[]> {
    const { vectorize } = await getBindings();

    const queryEmbedding = await generateEmbedding(query);

    // Use $in operator to filter by multiple datasource group IDs
    // This allows agents with multiple datasource groups to search across all of them
    const result = await vectorize.query(queryEmbedding, {
        topK,
        returnMetadata: 'all',
        filter: {
            datasourceGroupId: { $in: datasourceGroupIds }
        },
    });

    // Map results to typed interface
    return result.matches.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata as unknown as DatasourceVectorMetadata,
    }));
}

/**
 * Search for similar vectors within a single datasource group
 * Convenience function when filtering by a single group
 */
export async function searchVectorsInGroup(
    query: string,
    datasourceGroupId: number,
    topK: number = 5
): Promise<SearchResult[]> {
    return searchVectors(query, [datasourceGroupId], topK);
}
