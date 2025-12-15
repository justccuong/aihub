import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Get KV binding
 */
async function getBindings() {
    const { env } = await getCloudflareContext({ async: true });
    return {
        kv: env.AIHUB_KV,
    };
}

/**
 * Put value into KV
 * @param key - The key to store
 * @param value - The value to store
 * @param options - Optional KV put options (expiration, metadata, etc.)
 */
export async function putKV(
    key: string,
    value: string | ReadableStream | ArrayBuffer,
    options?: KVNamespacePutOptions
): Promise<void> {
    const { kv } = await getBindings();
    await kv.put(key, value, options);
}

/**
 * Get value from KV
 * @param key - The key to retrieve
 * @param type - The type of value to retrieve (text, json, arrayBuffer, stream)
 */
export async function getKV<T = string>(
    key: string,
    type: "text" | "json" | "arrayBuffer" | "stream" = "text"
): Promise<T | null> {
    const { kv } = await getBindings();
    // @ts-ignore - TS might complain about the generic return type not matching strictly without casting
    return await kv.get(key, type as any);
}

/**
 * Delete value from KV
 * @param key - The key to delete
 */
export async function deleteKV(key: string): Promise<void> {
    const { kv } = await getBindings();
    await kv.delete(key);
}
