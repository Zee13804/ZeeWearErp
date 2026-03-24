const path = require("path");
const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(__dirname, "..", "prisma", "dev.db")}`;
}

let prisma;

if (global._prismaClient) {
  prisma = global._prismaClient;
} else {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  global._prismaClient = prisma;
}

module.exports = prisma;
