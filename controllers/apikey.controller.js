import { prisma } from '../config/prisma.js'
import { uuidv7 } from 'uuidv7'

export const generateApiKey = async (req, res) => {
    try {
        const { userName } = req.body

        const apiKey = uuidv7()

        const savedKey = await prisma.apiKey.create({
            data: {
                key: apiKey,
                userName
            }
        })

        res.status(201).json({
            success: true,
            message: 'API key generated successfully',
            apiKey: savedKey.key
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'failed to generate api key',
            error: error.message
        })
    }
}