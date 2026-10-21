import { PrismaClient } from "@prisma/client";

/** Default categories (idempotent). Run: pnpm db:seed */
const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "serieux", name: "Sérieux", emoji: "◆" },
  { slug: "clients", name: "Clients", emoji: "✦" },
  { slug: "fun", name: "Fun", emoji: "☺" },
  { slug: "jeux", name: "Jeux", emoji: "◎" },
  { slug: "perso", name: "Perso", emoji: "○" },
];

async function main() {
  for (const [position, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: { ...c, position }, update: {} });
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

main().finally(() => prisma.$disconnect());
