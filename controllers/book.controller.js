import { prisma } from '../config/prisma.js'
import { searchData } from '../utils/searchV1.js'

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
    const books = await prisma.books.findMany()

    res.status(200).json({
      success: true,
      message: 'data fetched successfully',
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

        const result = await prisma.books.findMany({
            where,
            orderBy: { title: 'asc' },
            skip: ( page - 1) * limit,
            take: Number(limit)
        })

        res.status(200).json({
            success: true,
            message: result,
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