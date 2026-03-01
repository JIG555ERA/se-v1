import express from 'express';
import { generateApiKey } from '../controllers/apikey.controller.js'

const router = express.Router();

router.post('/generate', generateApiKey)

export default router