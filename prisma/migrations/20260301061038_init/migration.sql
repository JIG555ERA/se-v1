-- CreateTable
CREATE TABLE "Books" (
    "id" SERIAL NOT NULL,
    "ISBN" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "genre" TEXT NOT NULL,

    CONSTRAINT "Books_pkey" PRIMARY KEY ("id")
);
