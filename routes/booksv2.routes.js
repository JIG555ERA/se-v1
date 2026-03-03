import express from 'express';
import { createBook, getBooks, getBookById, deleteBookById, deleteBooks, createBooks, semanticSearch } from '../controllers/bookv2.controller.js'

const router = express.Router();

router.post('/createBook', createBook);
router.post('/createbooks', createBooks)
router.get('/getBooks', getBooks);
router.get('/getBook/:id', getBookById)
router.delete('/deleteBook/:id', deleteBookById)
router.delete('/deleteBooks', deleteBooks)
router.get('/search', semanticSearch)

export default router;