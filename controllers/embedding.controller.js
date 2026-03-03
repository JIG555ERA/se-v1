import { normalize } from 'node:path';
import { loadEmbedder } from '../lib/transformer.js'

export const createEmbedding = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'text required'
            })
        }

        const embedder = await loadEmbedder();

        const output = await embedder(text, {
            pooling: 'mean',
            normalize: true
        })

        res.status(200).json({
            success: true,
            embedding: output.data,
            dimension: output.data.length
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}