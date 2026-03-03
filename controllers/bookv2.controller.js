import { prisma } from '../config/prisma.js'
import { loadEmbedder } from '../lib/transformer.js'
import { getCache, setCache, deleteCache, deleteByPattern, deleteBookCache } from '../utils/cache.js'
import { cosineSimilarity } from '../utils/similarity.js'

const CACHE_TTL = 7200
const BOOKS_CACHE_KEY = 'booksv2:all'
const BOOK_CACHE_KEY = 'booksv2'
const SEARCH_CACHE_PREFIX = 'booksv2:semantic'

export const createBook = async (req, res) => {
    try {
        const { ISBN, title, author, description, category, genre } = req.body;

        if (!ISBN || !title || !author) {
            return res.status(400).json({
                success: false,
                message: `ISBN, title and author are required`
            })
        }

        // preparing text for embedding
        const text = `${title} ${description ?? ''} ${author} ${category ?? ''} ${genre ?? ''}`

        // load model
        const embedder = await loadEmbedder();

        // generate embedding
        const embedding = await embedder(text, {
            pooling: 'mean',
            normalize: true
        })

        // store in db
        const book = await prisma.booksV2.create({
            data: {
                ISBN: ISBN,
                title: title,
                author: author,
                description: description,
                category: category,
                genre: genre,
                embedding: Array.from(embedding.data)
            }
        })

        // delete cache
        await deleteCache(`${BOOKS_CACHE_KEY}`)
        await deleteByPattern(`${SEARCH_CACHE_PREFIX}:*`)

        // set cache
        await setCache(`${BOOK_CACHE_KEY}:${book.id}`, book, CACHE_TTL);

        // send response
        res.status(201).json({
            success: true,
            message: 'Book stored successfully',
            data: book
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

export const getBookById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const cachedBook = await getCache(`${BOOK_CACHE_KEY}:${id}`);

        if (cachedBook) {
            return res.status(200).json({
                success: true,
                message: 'book fetched successfully',
                source: 'cache',
                data: cachedBook,
            })
        }

        const book = await prisma.booksV2.findUnique({
            where: { id },
        })

        if (book) {
            await setCache(`${BOOK_CACHE_KEY}:${id}`, book, CACHE_TTL);
        }

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'no book record found'
            })
        }

        res.status(200).json({
            success: true,
            message: 'book fetched successfully',
            source: 'db',
            data: book
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: `can't fetch books`,
            message: error.message
        })
    }
}

export const getBooks = async (req, res) => {
    try {
        // get books from cache
        const cachedBooks = await getCache(BOOKS_CACHE_KEY);

        if (cachedBooks) {
            return res.status(200).json({
                success: true,
                message: 'books fetched successfully',
                source: 'cache',
                data: cachedBooks,
                count: cachedBooks.length
            })
        }

        const books = await prisma.booksV2.findMany();

        if (books.length > 0) {
            await setCache(BOOKS_CACHE_KEY, books, CACHE_TTL)
        }

        res.status(200).json({
            success: true,
            message: 'books fetched successfully',
            source: 'db',
            data: books,
            count: books.length
        })

    } catch (error) {
        res.status(500).json({
            success: true,
            message: 'failed to fetch books',
            error: error.message
        })
    }
} 

export const deleteBookById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const deleteBook = await prisma.booksV2.delete({
            where: { id },
        })

        // delete cache
        await deleteCache(`${BOOK_CACHE_KEY}:${id}`)

        // send response
        res.status(200).json({
            success: true,
            message: 'book deleted successfully'
        })


    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'no book record found'
        })
    }
}

export const deleteBooks = async (req, res) => {
    try {
        const deleteBooks = await prisma.booksV2.deleteMany();

        await deleteBookCache(`${BOOK_CACHE_KEY}`)

        res.status(200).json({
            success: true,
            message: 'books deleted successfully',
            data: deleteBooks
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

export const createBooks = async (req, res) => {
  try {
    const books = req.body

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be non-empty array'
      })
    }

    for (const book of books) {
      if (!book.ISBN || !book.title || !book.author) {
        return res.status(400).json({
          success: false,
          message: 'Each book must have ISBN, title and author'
        })
      }
    }

    const embedder = await loadEmbedder()

    const texts = books.map(book =>
      `${book.title} ${book.description ?? ''} ${book.author} ${book.category ?? ''} ${book.genre ?? ''}`
    )

    const embeddings = await embedder(texts, {
      pooling: 'mean',
      normalize: true
    })

    // 🔥 IMPORTANT FIX
    const dim = embeddings.data.length / texts.length

    const booksData = books.map((book, index) => {
      const start = index * dim
      const end = start + dim

      return {
        ISBN: book.ISBN,
        title: book.title,
        author: book.author,
        description: book.description ?? '',
        category: book.category ?? '',
        genre: book.genre ?? '',
        embedding: Array.from(embeddings.data.slice(start, end))
      }
    })

    const result = await prisma.booksV2.createMany({
      data: booksData,
      skipDuplicates: true
    })

    await deleteCache(BOOKS_CACHE_KEY)
    await deleteByPattern(`${SEARCH_CACHE_PREFIX}:*`)

    return res.status(201).json({
      success: true,
      message: `${result.count} books inserted successfully`
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export const semanticSearch = async (req, res) => {
  try {
    const { q, topK = 5 } = req.query

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      })
    }

    const cacheKey = `${SEARCH_CACHE_PREFIX}:${q}:${topK}`

    // cache
    const cached = await getCache(cacheKey)
    if (cached) {
      return res.status(200).json({
        success: true,
        source: 'cache',
        data: cached
      })
    }

    // embed query
    const embedder = await loadEmbedder()
    const queryEmbedding = await embedder(q, {
      pooling: 'mean',
      normalize: true
    })

    const queryVector = Array.from(queryEmbedding.data)

    // fetch books
    const books = await prisma.booksV2.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        genre: true,
        embedding: true
      }
    })

    // similarity
    const scoredResults = books
      .filter(book => Array.isArray(book.embedding) && book.embedding.length)
      .map(book => ({
        ...book,
        score: cosineSimilarity(queryVector, book.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(topK))

    await setCache(cacheKey, scoredResults, CACHE_TTL)

    return res.status(200).json({
      success: true,
      source: 'db',
      count: scoredResults.length,
      data: scoredResults
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}