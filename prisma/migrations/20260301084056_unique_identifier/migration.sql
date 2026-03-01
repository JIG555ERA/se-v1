/*
  Warnings:

  - A unique constraint covering the columns `[ISBN]` on the table `Books` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Books_ISBN_key" ON "Books"("ISBN");
