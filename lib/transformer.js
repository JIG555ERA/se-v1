import { pipeline } from '@xenova/transformers'

// caching the model in memory
let embedder = null;

export const loadEmbedder = async () => {
    if (!embedder) {
        embedder = await pipeline(
            'feature-extraction',
            'Xenova/e5-large-v2'
        )
    }
    return embedder;
}