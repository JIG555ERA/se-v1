import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const categories = ["Fiction", "Non-Fiction", "Science", "History", "Technology"];
const genres = ["Thriller", "Romance", "Fantasy", "Biography", "Horror", "Self-help"];

function generateISBN() {
  return faker.string.numeric(13); // 13-digit ISBN
}

async function main() {
  const books = Array.from({ length: 1000 }, () => ({
    ISBN: generateISBN(),
    title: faker.lorem.words({ min: 2, max: 5 }),
    author: faker.person.fullName(),
    description: faker.lorem.sentences(2),
    category: faker.helpers.arrayElement(categories),
    genre: faker.helpers.arrayElement(genres),
  }));

  await prisma.books.createMany({
    data: books,
    skipDuplicates: true, // avoids unique ISBN crash
  });

  console.log("✅ 1000 books inserted");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });