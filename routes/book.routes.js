import express from 'express'

const router = express.Router()

import { createBook, getBooks, createBooks, deleteBooks, search } from '../controllers/book.controller.js'
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js'

router.get('/search', search)
router.get('/getBooks', getBooks)

// protected routes
router.post('/createBook', apiKeyAuth, createBook)
router.post('/createBooks', apiKeyAuth, createBooks)
router.delete('/deleteBooks', apiKeyAuth, deleteBooks)

export default router