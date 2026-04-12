const path = require("path");

process.env.DATABASE_URL = `file:${path.join(__dirname, "prisma", "dev.db")}`;

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedDevUser() {
  const email = "dev@zeewear.com";
  const password = "Admin123";
  const role = "dev";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] User ${email} already exists. Skipping.`);
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role },
  });

  console.log(`[seed] Dev user created: ${user.email} (role: ${user.role})`);
  await prisma.$disconnect();
}

seedDevUser().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
