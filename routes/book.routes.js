import express from 'express'

const router = express.Router()

import { createBook, getBooks, createBooks, deleteBooks, search } from '../controllers/book.controller.js'

router.post('/createBook', createBook)
router.post('/createBooks', createBooks)
router.get('/search', search)
router.get('/getBooks', getBooks)
router.delete('/deleteBooks', deleteBooks)

export default router