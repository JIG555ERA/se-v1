# Search Engine Server API Documentation

<div align="center">

**Express + Prisma + PostgreSQL + Redis + Transformer-based Semantic Search**

</div>

---

## Overview

This server exposes two versions of book APIs:

- `v1`: keyword/token search with cache + API key-protected write routes
- `v2`: embedding-based semantic search with cosine similarity + cache

It also includes:

- API key generation endpoint
- text embedding endpoint
- Redis-backed cache utilities

---

## Base URL

Local base URL:

```txt
http://localhost:<PORT>
```

Health endpoint:

- `GET /`

Success response:

```json
{
  "success": true,
  "message": "server functioning finely",
  "isActive": true
}
```

---

## Tech Stack

- Node.js + Express 5
- Prisma ORM + PostgreSQL (`@prisma/adapter-pg`)
- Redis (`ioredis`, Upstash-compatible TLS config)
- `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) for embeddings
- UUID v7 for API key generation

---

## Environment Variables

Create `.env` with at least:

```env
PORT=5000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_URL=rediss://...
```

Notes:

- `DATABASE_URL` is used by runtime Prisma client (`config/prisma.js`)
- `DIRECT_URL` is used by Prisma config (`prisma.config.ts`) for migrations

---

## Folder Architecture

```txt
server/
|-- api/
|   `-- index.js                    # Vercel/serverless entry
|-- config/
|   |-- prisma.js                   # Prisma client (pg adapter)
|   |-- redis.js                    # Redis client setup
|   `-- firebase.js                 # Firebase placeholder import
|-- controllers/
|   |-- apikey.controller.js        # API key generation
|   |-- book.controller.js          # Books v1 CRUD/search
|   |-- bookv2.controller.js        # Books v2 CRUD/semantic search
|   `-- embedding.controller.js     # Standalone embedding API
|-- datasets/
|   `-- data.json                   # Sample book dataset
|-- lib/
|   `-- transformer.js              # Singleton embedding model loader
|-- middlewares/
|   `-- apiKeyAuth.js               # x-api-key validation middleware
|-- prisma/
|   |-- migrations/                 # DB migrations
|   |-- schema.prisma               # Data models
|   `-- seed.js                     # Fake data seeder (Books)
|-- routes/
|   |-- ai.routes.js
|   |-- apikey.routes.js
|   |-- book.routes.js
|   `-- booksv2.routes.js
|-- utils/
|   |-- cache.js                    # get/set/delete/pattern cache utils
|   |-- searchV1.js                 # local search helper (not wired to route)
|   `-- similarity.js               # cosine similarity
|-- server.js                       # app wiring + route mounts
|-- prisma.config.ts                # Prisma CLI config
|-- package.json
`-- README.md
```

---

## Data Model (Prisma)

### `Books`

- `id` (Int, PK, auto increment)
- `ISBN` (String, unique)
- `title`, `author`, `description`, `category`, `genre`

### `BooksV2`

- `id` (Int, PK, auto increment)
- `ISBN` (String, unique)
- `title`, `author`, `description`, `category`, `genre`
- `embedding` (Float[])
- `createdAt`, `updatedAt`

### `ApiKey`

- `id` (UUID, PK)
- `key` (String, unique)
- `userName` (nullable)
- `isActive` (default `true`)
- `createdAt`, `lastUsed`

---

## Route Map

Mounted in `server.js`:

- `/api/v1/books`
- `/api/v2/books`
- `/api/v1/apiKey`
- `/api/v1/ai`

---

## API Documentation

## 1) API Key APIs

Base: `/api/v1/apiKey`

### `POST /generate`

Generate and persist a new API key.

Request body:

```json
{
  "userName": "jigar"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "API key generated successfully",
  "apiKey": "<uuidv7-key>"
}
```

---

## 2) Embedding API

Base: `/api/v1/ai`

### `POST /embed`

Creates normalized sentence embedding for input text.

Request body:

```json
{
  "text": "Atomic habits for personal growth"
}
```

Validation:

- `text` required, else `400`

Response `200`:

```json
{
  "success": true,
  "embedding": [0.0123, -0.044, 0.1001],
  "dimension": 384
}
```

---

## 3) Books V1 APIs (Keyword Search)

Base: `/api/v1/books`

Auth:

- Required only for mutation endpoints (`createBook`, `createBooks`, `deleteBooks`)
- Header: `x-api-key: <generated-key>`

### `GET /getBooks`

Returns all books from cache first, then DB.

Response fields:

- `source`: `cache` or `db`
- `count`

### `GET /search?q=<text>&page=1&limit=20`

Token-based search across:

- `ISBN`, `title`, `author`, `description`, `category`, `genre`

Behavior:

- query split into lowercase tokens
- each token must match at least one searchable field (`AND` over tokens, `OR` over fields)
- ordered by `title asc`
- paginated with `skip/take`
- cached by key `books:search<q>:<page>:<limit>`

Validation:

- missing `q` -> `400`

### `POST /createBook` (Protected)

Creates one record in `Books`.

Request body:

```json
{
  "ISBN": "9780307277671",
  "title": "Atomic Habits",
  "author": "James Clear",
  "description": "A guide to building good habits",
  "category": "Self-help",
  "genre": "Productivity"
}
```

Post-write cache invalidation:

- `books:all`
- all search cache keys with prefix `books:search`

### `POST /createBooks` (Protected)

Bulk insert with `createMany` + `skipDuplicates: true`.

Request body: array of books.

### `DELETE /deleteBooks` (Protected)

Deletes all `Books` rows.

Post-delete cache invalidation:

- `books:all`
- `books:search*`

---

## 4) Books V2 APIs (Semantic Search)

Base: `/api/v2/books`

Important route names:

- bulk create route is `POST /createbooks` (lowercase `b`)

### `POST /createBook`

Validates `ISBN`, `title`, `author`, then:

1. builds combined text
2. generates normalized embedding from transformer model
3. stores record in `BooksV2`
4. invalidates list/search cache
5. stores newly created item in single-book cache

### `POST /createbooks`

Bulk insert flow:

1. validates request is non-empty array
2. validates each book has `ISBN`, `title`, `author`
3. embeds all texts in batch
4. slices flat embedding output per item
5. inserts with `createMany` + `skipDuplicates`
6. invalidates list/search cache

### `GET /getBooks`

Returns all `BooksV2`, cache-first.

### `GET /getBook/:id`

Returns one `BooksV2` record by numeric id, cache-first.

- not found -> `404`

### `DELETE /deleteBook/:id`

Deletes one `BooksV2` row and clears that item cache.

### `DELETE /deleteBooks`

Deletes all `BooksV2` rows and clears `booksv2:*` cache keys via Redis `SCAN`.

### `GET /search?q=<text>&topK=5`

Semantic search flow:

1. embed query text
2. fetch all books with embeddings
3. compute cosine similarity (query vs each book embedding)
4. rank descending by score
5. return top `K`
6. cache by key `booksv2:semantic:<q>:<topK>`

Validation:

- missing `q` -> `400`

Response `200`:

```json
{
  "success": true,
  "source": "db",
  "count": 5,
  "data": [
    {
      "id": 1,
      "title": "Atomic Habits",
      "author": "James Clear",
      "description": "...",
      "category": "Self-help",
      "genre": "Productivity",
      "embedding": [0.1, 0.2],
      "score": 0.8732
    }
  ]
}
```

---

## Authentication Working

Protected endpoints use `apiKeyAuth` middleware:

1. reads `x-api-key`
2. returns `401` if missing
3. checks `ApiKey` table
4. returns `403` if key missing/inactive
5. asynchronously updates `lastUsed`
6. attaches key record to `req.apiKey`

Protected routes currently:

- `POST /api/v1/books/createBook`
- `POST /api/v1/books/createBooks`
- `DELETE /api/v1/books/deleteBooks`

---

## Caching Strategy

Redis utility functions:

- `getCache(key)`
- `setCache(key, value, ttlSeconds)`
- `deleteCache(key)`
- `deleteByPattern(pattern)`
- `deleteBookCache(prefix)` using incremental `SCAN`

TTL values in code:

- V1 books/search: `3600` seconds
- V2 books/search/single-book: `7200` seconds

Cache keys used:

- `books:all`
- `books:search<q>:<page>:<limit>`
- `booksv2:all`
- `booksv2:<id>`
- `booksv2:semantic:<q>:<topK>`

---

## End-to-End Working

Request lifecycle:

1. `server.js` mounts route groups
2. route delegates to controller
3. controller optionally validates body/query/header
4. controller may use cache before DB
5. Prisma performs DB operation
6. response sent with consistent `success` + payload metadata

Semantic pipeline (V2):

1. model lazily loaded once (`lib/transformer.js` singleton)
2. embeddings generated with `pooling: mean`, `normalize: true`
3. vectors stored in `BooksV2.embedding`
4. query vector compared with stored vectors via cosine similarity

---

## Local Setup

Install and run:

```bash
npm install
npx prisma migrate dev
npm run start
```

Optional seed:

```bash
npx prisma db seed
```

---

## Quick cURL Examples

Generate API key:

```bash
curl -X POST http://localhost:5000/api/v1/apiKey/generate \
  -H "Content-Type: application/json" \
  -d '{"userName":"jigar"}'
```

Create v1 book (protected):

```bash
curl -X POST http://localhost:5000/api/v1/books/createBook \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-key>" \
  -d '{"ISBN":"9780307277671","title":"Atomic Habits","author":"James Clear","description":"...","category":"Self-help","genre":"Productivity"}'
```

Semantic search v2:

```bash
curl "http://localhost:5000/api/v2/books/search?q=habit%20formation&topK=5"
```

---

## Current Notes

- `GET /api/v2/books/getBook/:id` error handler has duplicate `message` key in code; the second assignment overrides the first.
- `config/firebase.js` exists but is not integrated into active request flow.
- `utils/searchV1.js` is currently a helper file and is not wired to routes.

