import { prisma } from '../config/prisma.js'

export const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key']

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key missing'
            })
        }

        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey }
        })

        if (!keyRecord || !keyRecord.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or inactive API key'
            })
        }

        prisma.apiKey.update({
            where: { key: apiKey },
            data: { lastUsed: new Date() },
        }).catch(() => {})

        req.apiKey = keyRecord
        next()

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'failed to validate',
            error: error.message
        })
    }
} 