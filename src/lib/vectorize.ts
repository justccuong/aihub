import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Entity types stored in vector database
 */
export type VectorEntityType = 'work_experience' | 'education' | 'project' | 'award' | 'skill' | 'activity' | 'certificate' | 'profile';

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
 * Create vector ID with type prefix for uniqueness
 */
export function createVectorId(type: VectorEntityType, id: number): string {
    return `${type}:${id}`;
}

/**
 * Upsert vector to Vectorize index
 * Generates embedding and stores with metadata
 */
export async function upsertVector(
    type: VectorEntityType,
    id: number,
    title: string,
    content: string
): Promise<void> {
    const { vectorize } = await getBindings();

    const vectorId = createVectorId(type, id);
    const embedding = await generateEmbedding(content);

    // Metadata must be Record<string, VectorizeVectorMetadata>
    const metadata: Record<string, VectorizeVectorMetadata> = {
        type,
        id,
        title,
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
export async function deleteVector(
    type: VectorEntityType,
    id: number
): Promise<void> {
    const { vectorize } = await getBindings();
    const vectorId = createVectorId(type, id);

    await vectorize.deleteByIds([vectorId]);
}

/**
 * Search for similar vectors
 * Returns top K most similar vectors with metadata
 */
export async function searchVectors(
    query: string,
    topK: number = 5
): Promise<VectorizeMatches> {
    const { vectorize } = await getBindings();

    const queryEmbedding = await generateEmbedding(query);

    return vectorize.query(queryEmbedding, {
        topK,
        returnMetadata: 'all',
    });
}

/**
 * Helper to create embeddable text for different entity types
 */
export const createEmbeddableText = {
    workExperience: (data: {
        company: string;
        position: string;
        location?: string | null;
        description?: string[] | null;
    }): string => {
        const parts = [`${data.company} - ${data.position}`];
        if (data.location) parts.push(`at ${data.location}`);
        if (data.description?.length) parts.push(data.description.join('. '));
        return parts.join('. ');
    },

    education: (data: {
        institution: string;
        degree?: string | null;
        major?: string | null;
        achievements?: string[] | null;
    }): string => {
        const parts = [data.institution];
        if (data.degree) parts.push(data.degree);
        if (data.major) parts.push(`in ${data.major}`);
        if (data.achievements?.length) parts.push(data.achievements.join('. '));
        return parts.join(' - ');
    },

    project: (data: {
        name: string;
        role?: string | null;
        description?: string[] | null;
        technologies?: string[] | null;
    }): string => {
        const parts = [data.name];
        if (data.role) parts.push(`(${data.role})`);
        if (data.description?.length) parts.push(data.description.join('. '));
        if (data.technologies?.length) parts.push(`Technologies: ${data.technologies.join(', ')}`);
        return parts.join(' - ');
    },

    award: (data: {
        title: string;
        prize?: string | null;
        issuer?: string | null;
        description?: string[] | null;
    }): string => {
        const parts = [data.title];
        if (data.prize) parts.push(`(${data.prize})`);
        if (data.issuer) parts.push(`from ${data.issuer}`);
        if (data.description?.length) parts.push(data.description.join('. '));
        return parts.join(' - ');
    },

    skill: (category: string, name: string): string => {
        return `${category}: ${name}`;
    },

    activity: (data: {
        organization: string;
        role?: string | null;
        description?: string[] | null;
    }): string => {
        const parts = [data.organization];
        if (data.role) parts.push(`as ${data.role}`);
        if (data.description?.length) parts.push(data.description.join('. '));
        return parts.join(' - ');
    },

    certificate: (data: {
        title: string;
        issuer?: string | null;
    }): string => {
        const parts = [data.title];
        if (data.issuer) parts.push(`from ${data.issuer}`);
        return parts.join(' ');
    },

    profile: (data: {
        fullName: string;
        bio?: string | null;
    }): string => {
        const parts = [data.fullName];
        if (data.bio) parts.push(data.bio);
        return parts.join(': ');
    },
};
