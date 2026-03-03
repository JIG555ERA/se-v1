import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import bookRoutes from './routes/book.routes.js'
import apiKeyRoutes from './routes/apikey.routes.js'
import aiRoutes from './routes/ai.routes.js'

const PORT = process.env.PORT

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'server functioning finely',
            isActive: true
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'server under maintenance',
            error: error.message
        })
    }
})
app.use('/api/v1/books', bookRoutes)
app.use('/api/v1/apiKey', apiKeyRoutes)
app.use('/api/v1/ai', aiRoutes)

export default app;

// app.listen(PORT, () => {
//     console.log(`Server is runnnig on http://localhost${PORT}/api/v1/books/`)
// })