import express from 'express';
import { createEmbedding } from '../controllers/embedding.controller.js'

const router = express.Router();

router.post('/embed', createEmbedding);

export default router;