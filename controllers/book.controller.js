import { prisma } from '../config/prisma.js'
import { getCache, setCache, deleteCache, deleteByPattern } from '../utils/cache.js'

const CACHE_TTL = 3600
const BOOKS_CACHE_KEY = 'books:all'
const SEARCH_CACHE_PREFIX = 'books:search'

const createBook = async (req, res) => {
  try {
    const { ISBN, title, author, description, category, genre } = req.body

    const book = await prisma.books.create({
      data: {
        ISBN,
        title,
        author,
        description,
        category,
        genre,
      },
    })

    // invalidate cache
    await deleteCache(BOOKS_CACHE_KEY)
    await deleteByPattern(`${SEARCH_CACHE_PREFIX}`)

    res.status(201).json({
      success: true,
      message: 'book data inserted successfully',
      data: book,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const createBooks = async (req, res) => {
    try {
        const books = req.body; // array
        
        const result = await prisma.books.createMany({
            data: books,
            skipDuplicates: true
        })

        res.status(201).json({
            success: true,
            message: 'all books inserted successfully',
            data: result
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

const getBooks = async (req, res) => {
  try {
    // 1. check cache
    const cachedBooks = await getCache(BOOKS_CACHE_KEY)
    if (cachedBooks) {
        return res.status(200).json({
            success: true,
            message: 'data fetched successfully',
            source: 'cache',
            data: cachedBooks,
            count: cachedBooks.length
        })
    }

    // 2. fetch from db
    const books = await prisma.books.findMany()

    // 3. set to cache
    await setCache(BOOKS_CACHE_KEY, books, CACHE_TTL)

    res.status(200).json({
      success: true,
      message: 'data fetched successfully',
      source: 'db',
      data: books,
      count: books.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const deleteBooks = async (req, res) => {
    try {
        const result = await prisma.books.deleteMany();

        // invalidate cache

        await deleteCache(BOOKS_CACHE_KEY);
        await deleteByPattern(`${SEARCH_CACHE_PREFIX}`)

        res.status(200).json({
            success: true,
            message: 'table cleared successfully',
            data: result,
            count: result.length
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

const search = async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'search query is required'
            })
        }

        const cacheKey = await `${SEARCH_CACHE_PREFIX}${q}:${PAGE}:${LIMIT}`

        // 1. check cache
        const cachedResult = await getCache(cacheKey)
        if (cachedResult) {
            return res.status(200).json({
                success: true,
                message: 'search result from cache',
                source: 'cache',
                data: cachedResult,
                count: cachedResult.length
            })
        }

        const tokens = q
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)

        const where = {
            AND: tokens.map((token) => ({
                OR: [
                    { ISBN: { contains: token, mode: 'insensitive' } },
                    { title: { contains: token, mode: 'insensitive'} },
                    { author: { contains: token, mode: 'insensitive'} },
                    { category: { contains: token, mode: 'insensitive'} },
                    { genre: { contains: token, mode: 'insensitive'} },
                    { description: { contains: token, mode: 'insensitive'} }
                ]
            }))
        }

        // 2. fetch from db
        const result = await prisma.books.findMany({
            where,
            orderBy: { title: 'asc' },
            skip: ( page - 1) * limit,
            take: Number(limit)
        })

        // 3. cache search result
        await setCache(cacheKey, result, CACHE_TTL)

        res.status(200).json({
            success: true,
            message: 'data fetched successfully',
            source: 'db',
            data: result,
            count: result.length,
            page: Number(page)
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'internal server error',
            error: error.message
        })
    }
}

export { createBook, getBooks, createBooks, deleteBooks, search }