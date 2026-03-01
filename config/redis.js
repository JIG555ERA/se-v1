import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export const redis = new Redis(process.env.REDIS_URL, {
    tls: {
        rejectUnauthorized: false,
    },
    maxRetriesPerRequest: null,
})

redis.on('connect', () => {
    console.log('Redis (upstash) connected')
})

redis.on('error', (error) => {
    console.error(`Redis error: ${error}`)
})