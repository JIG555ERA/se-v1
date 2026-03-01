import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import bookRoutes from './routes/book.routes.js'

const PORT = process.env.PORT

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/v1/books', bookRoutes)

export default app;